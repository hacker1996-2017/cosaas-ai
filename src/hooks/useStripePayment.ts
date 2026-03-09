import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type StripeAction =
  | { action: 'create_customer'; clientName?: string; clientEmail: string; organizationId?: string; clientId?: string }
  | { action: 'create_payment_link'; amount: number; currency?: string; description?: string; clientEmail?: string; clientName?: string; organizationId?: string; metadata?: Record<string, string> }
  | { action: 'create_invoice'; customerId: string; items: { amount: number; currency?: string; description?: string }[]; organizationId?: string; dueInDays?: number }
  | { action: 'send_invoice'; invoiceId: string }
  | { action: 'list_payments'; limit?: number }
  | { action: 'get_balance' }
  | { action: 'health' };

async function callStripe<T = unknown>(payload: StripeAction): Promise<T> {
  const { data, error } = await supabase.functions.invoke('stripe-payment', { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

// ─── Create or resolve a Stripe customer ────────────────────────────────────
export function useCreateStripeCustomer() {
  return useMutation({
    mutationFn: (params: { clientName?: string; clientEmail: string; organizationId?: string; clientId?: string }) =>
      callStripe<{ customer: { id: string; email: string | null; name: string | null } }>({
        action: 'create_customer',
        ...params,
      }),
    onSuccess: () => toast.success('Stripe customer ready'),
    onError: (e: Error) => toast.error(`Stripe error: ${e.message}`),
  });
}

// ─── Create a payment link ──────────────────────────────────────────────────
export function useCreatePaymentLink() {
  return useMutation({
    mutationFn: (params: {
      amount: number;
      currency?: string;
      description?: string;
      clientEmail?: string;
      organizationId?: string;
      metadata?: Record<string, string>;
    }) =>
      callStripe<{ url: string; paymentLinkId: string }>({
        action: 'create_payment_link',
        ...params,
      }),
    onSuccess: ({ url }) => {
      toast.success('Payment link created');
      window.open(url, '_blank');
    },
    onError: (e: Error) => toast.error(`Failed to create payment link: ${e.message}`),
  });
}

// ─── Create & finalize a Stripe invoice ────────────────────────────────────
export function useCreateStripeInvoice() {
  return useMutation({
    mutationFn: (params: {
      customerId: string;
      items: { amount: number; currency?: string; description?: string }[];
      organizationId?: string;
      dueInDays?: number;
    }) =>
      callStripe<{ invoiceId: string; invoiceUrl: string | null; status: string | null; amountDue: number }>({
        action: 'create_invoice',
        ...params,
      }),
    onSuccess: ({ invoiceUrl }) => {
      toast.success('Invoice created');
      if (invoiceUrl) window.open(invoiceUrl, '_blank');
    },
    onError: (e: Error) => toast.error(`Invoice creation failed: ${e.message}`),
  });
}

// ─── List recent payments ───────────────────────────────────────────────────
export function useListStripePayments() {
  return useMutation({
    mutationFn: (limit = 25) =>
      callStripe<{
        payments: { id: string; amount: number; currency: string; status: string; description: string | null; created: string; customerEmail: string | null }[];
      }>({ action: 'list_payments', limit }),
    onError: (e: Error) => toast.error(`Failed to load payments: ${e.message}`),
  });
}

// ─── Stripe balance ─────────────────────────────────────────────────────────
export function useStripeBalance() {
  return useMutation({
    mutationFn: () =>
      callStripe<{ available: { amount: number; currency: string }[]; pending: { amount: number; currency: string }[] }>({
        action: 'get_balance',
      }),
    onError: (e: Error) => toast.error(`Balance check failed: ${e.message}`),
  });
}
