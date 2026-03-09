import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    const body = await req.json();
    const { action } = body;
    logStep("Action requested", { action });

    switch (action) {
      // ─── Create or find Stripe customer from a CRM client ───
      case "create_customer": {
        const { clientName, clientEmail, organizationId, clientId } = body;
        if (!clientEmail) throw new Error("clientEmail is required");

        const existing = await stripe.customers.list({ email: clientEmail, limit: 1 });
        let customer: Stripe.Customer;

        if (existing.data.length > 0) {
          customer = existing.data[0];
          logStep("Existing Stripe customer found", { customerId: customer.id });
        } else {
          customer = await stripe.customers.create({
            email: clientEmail,
            name: clientName || undefined,
            metadata: {
              organization_id: organizationId || "",
              client_id: clientId || "",
              source: "cosass-platform",
            },
          });
          logStep("Created Stripe customer", { customerId: customer.id });
        }

        return jsonResponse({ customer: { id: customer.id, email: customer.email, name: customer.name } });
      }

      // ─── Create a one-off payment link for a client invoice ───
      case "create_payment_link": {
        const { amount, currency, description, clientEmail, clientName, organizationId, metadata: extraMeta } = body;
        if (!amount || amount <= 0) throw new Error("amount must be > 0");

        // Create an ad-hoc price
        const price = await stripe.prices.create({
          unit_amount: Math.round(amount * 100),
          currency: currency || "usd",
          product_data: {
            name: description || "Invoice Payment",
          },
        });

        const paymentLink = await stripe.paymentLinks.create({
          line_items: [{ price: price.id, quantity: 1 }],
          metadata: {
            organization_id: organizationId || "",
            created_by: user.id,
            ...(extraMeta || {}),
          },
        });

        logStep("Payment link created", { url: paymentLink.url });
        return jsonResponse({ url: paymentLink.url, paymentLinkId: paymentLink.id });
      }

      // ─── Create a Stripe invoice for a customer ───
      case "create_invoice": {
        const { customerId, items, organizationId, dueInDays } = body;
        if (!customerId) throw new Error("customerId is required");
        if (!items?.length) throw new Error("items array is required");

        const invoice = await stripe.invoices.create({
          customer: customerId,
          collection_method: "send_invoice",
          days_until_due: dueInDays || 30,
          metadata: {
            organization_id: organizationId || "",
            created_by: user.id,
          },
        });

        for (const item of items) {
          await stripe.invoiceItems.create({
            customer: customerId,
            invoice: invoice.id,
            amount: Math.round((item.amount || 0) * 100),
            currency: item.currency || "usd",
            description: item.description || "Service",
          });
        }

        const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
        logStep("Invoice created & finalized", { invoiceId: finalized.id, hostedUrl: finalized.hosted_invoice_url });

        return jsonResponse({
          invoiceId: finalized.id,
          invoiceUrl: finalized.hosted_invoice_url,
          status: finalized.status,
          amountDue: (finalized.amount_due || 0) / 100,
        });
      }

      // ─── Send an existing invoice ───
      case "send_invoice": {
        const { invoiceId } = body;
        if (!invoiceId) throw new Error("invoiceId is required");
        const sent = await stripe.invoices.sendInvoice(invoiceId);
        logStep("Invoice sent", { invoiceId: sent.id });
        return jsonResponse({ invoiceId: sent.id, status: sent.status });
      }

      // ─── List recent payments for the org ───
      case "list_payments": {
        const { limit: payLimit } = body;
        const paymentIntents = await stripe.paymentIntents.list({
          limit: payLimit || 25,
        });

        const payments = paymentIntents.data.map((pi) => ({
          id: pi.id,
          amount: (pi.amount || 0) / 100,
          currency: pi.currency,
          status: pi.status,
          description: pi.description,
          created: new Date(pi.created * 1000).toISOString(),
          customerEmail: pi.receipt_email,
        }));

        logStep("Listed payments", { count: payments.length });
        return jsonResponse({ payments });
      }

      // ─── Get account balance ───
      case "get_balance": {
        const balance = await stripe.balance.retrieve();
        const available = balance.available.map((b) => ({
          amount: b.amount / 100,
          currency: b.currency,
        }));
        const pending = balance.pending.map((b) => ({
          amount: b.amount / 100,
          currency: b.currency,
        }));
        logStep("Balance retrieved", { available, pending });
        return jsonResponse({ available, pending });
      }

      // ─── Health check ───
      case "health": {
        const bal = await stripe.balance.retrieve();
        logStep("Health check passed");
        return jsonResponse({ healthy: true, mode: stripeKey.startsWith("sk_live") ? "live" : "test" });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
