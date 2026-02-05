 import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 }
 
 Deno.serve(async (req) => {
   // Handle CORS preflight requests
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders })
   }
 
   try {
     // Get the authorization header to identify the user
     const authHeader = req.headers.get('Authorization')
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: 'Missing authorization header' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Create a client with anon key to verify the user's token
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
     const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
 
     if (!supabaseAnonKey) {
       console.error('Missing SUPABASE_ANON_KEY')
       return new Response(
         JSON.stringify({ error: 'Server configuration error' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Verify the user's JWT
     const userClient = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } }
     })
     
     const { data: { user }, error: userError } = await userClient.auth.getUser()
     
     if (userError || !user) {
       return new Response(
         JSON.stringify({ error: 'Unauthorized' }),
         { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Parse the request body
     const { name, industry, market, autonomy_level } = await req.json()
 
     if (!name || !name.trim()) {
       return new Response(
         JSON.stringify({ error: 'Company name is required' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // Use service role client to bypass RLS
     const adminClient = createClient(supabaseUrl, supabaseServiceKey)
 
     // Check if user already has an organization
     const { data: profile } = await adminClient
       .from('profiles')
       .select('organization_id')
       .eq('id', user.id)
       .single()
 
     if (profile?.organization_id) {
       return new Response(
         JSON.stringify({ error: 'User already has an organization' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // 1. Create the organization
     const { data: org, error: orgError } = await adminClient
       .from('organizations')
       .insert({
         name: name.trim(),
         industry: industry || null,
         market: market || null,
         autonomy_level: autonomy_level || 'draft_actions'
       })
       .select()
       .single()
 
     if (orgError) {
       console.error('Failed to create organization:', orgError)
       return new Response(
         JSON.stringify({ error: 'Failed to create organization' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // 2. Update user's profile with organization_id
     const { error: profileError } = await adminClient
       .from('profiles')
       .update({ organization_id: org.id })
       .eq('id', user.id)
 
     if (profileError) {
       console.error('Failed to update profile:', profileError)
       // Rollback - delete the organization
       await adminClient.from('organizations').delete().eq('id', org.id)
       return new Response(
         JSON.stringify({ error: 'Failed to link organization to profile' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       )
     }
 
     // 3. Assign CEO role to the user
     const { error: roleError } = await adminClient
       .from('user_roles')
       .insert({
         user_id: user.id,
         organization_id: org.id,
         role: 'ceo'
       })
 
     if (roleError) {
       console.error('Failed to assign CEO role:', roleError)
     }
 
     // 4. Create default AI agents based on industry/market
     const agents = getAgentsForIndustryMarket(industry || 'Other', market || 'Other')
     const agentInserts = agents.map(agent => ({
       ...agent,
       organization_id: org.id,
       is_system_agent: true,
       status: 'available' as const
     }))
 
     const { error: agentsError } = await adminClient
       .from('agents')
       .insert(agentInserts)
 
     if (agentsError) {
       console.error('Failed to create agents:', agentsError)
     }
 
     return new Response(
       JSON.stringify({ organization: org, success: true }),
       { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     )
 
   } catch (error) {
     console.error('Error:', error)
     return new Response(
       JSON.stringify({ error: 'Internal server error' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     )
   }
 })
 
 // Industry-specific agent configurations
 function getAgentsForIndustryMarket(industry: string, market: string) {
   const baseAgents = [
     { name: 'Chief of Staff', emoji: '🎯', role: 'Executive coordination, priority management, cross-functional alignment' },
   ]
 
   const industryAgents: Record<string, { name: string; emoji: string; role: string }[]> = {
     'Technology': [
       { name: 'Tech Ops Agent', emoji: '⚙️', role: 'Technical infrastructure, system monitoring, DevOps coordination, sprint planning' },
       { name: 'Product Agent', emoji: '🚀', role: 'Product roadmap, feature prioritization, user feedback analysis' },
     ],
     'Healthcare': [
       { name: 'Compliance Agent', emoji: '📋', role: 'HIPAA compliance, regulatory monitoring, audit preparation' },
       { name: 'Patient Ops Agent', emoji: '🏥', role: 'Patient experience, care coordination, appointment optimization' },
     ],
     'Finance': [
       { name: 'Risk Agent', emoji: '⚠️', role: 'Risk assessment, compliance monitoring, fraud detection' },
       { name: 'Portfolio Agent', emoji: '📊', role: 'Investment analysis, portfolio optimization, market research' },
     ],
     'Retail': [
       { name: 'Inventory Agent', emoji: '📦', role: 'Stock management, supply chain optimization, vendor relations' },
       { name: 'Merchandising Agent', emoji: '🏪', role: 'Product placement, pricing strategy, seasonal planning' },
     ],
     'Manufacturing': [
       { name: 'Production Agent', emoji: '🏭', role: 'Production scheduling, quality control, equipment maintenance' },
       { name: 'Supply Chain Agent', emoji: '🚚', role: 'Supplier management, logistics optimization, procurement' },
     ],
     'Education': [
       { name: 'Curriculum Agent', emoji: '📚', role: 'Course development, learning outcomes, accreditation compliance' },
       { name: 'Student Success Agent', emoji: '🎓', role: 'Enrollment management, student engagement, retention analysis' },
     ],
     'Real Estate': [
       { name: 'Property Agent', emoji: '🏠', role: 'Listing management, market analysis, property valuation' },
       { name: 'Transaction Agent', emoji: '📝', role: 'Deal coordination, contract management, closing process' },
     ],
     'Consulting': [
       { name: 'Project Agent', emoji: '📋', role: 'Project delivery, resource allocation, milestone tracking' },
       { name: 'Knowledge Agent', emoji: '🧠', role: 'Best practices, methodology updates, thought leadership' },
     ],
     'Marketing': [
       { name: 'Campaign Agent', emoji: '📣', role: 'Campaign management, creative coordination, performance tracking' },
       { name: 'Analytics Agent', emoji: '📈', role: 'Marketing analytics, attribution modeling, ROI optimization' },
     ],
   }
 
   const marketAgents: Record<string, { name: string; emoji: string; role: string }[]> = {
     'B2B SaaS': [
       { name: 'Customer Success Agent', emoji: '🤝', role: 'Onboarding, retention, expansion revenue, health scoring' },
       { name: 'Sales Ops Agent', emoji: '💼', role: 'Pipeline management, deal velocity, revenue forecasting' },
     ],
     'B2C': [
       { name: 'Growth Agent', emoji: '📈', role: 'User acquisition, conversion optimization, viral loops' },
       { name: 'Community Agent', emoji: '👥', role: 'Social engagement, brand advocacy, user feedback' },
     ],
     'Enterprise': [
       { name: 'Account Agent', emoji: '🏢', role: 'Strategic accounts, executive relationships, multi-year contracts' },
       { name: 'Security Agent', emoji: '🔒', role: 'Security compliance, data governance, audit support' },
     ],
     'SMB': [
       { name: 'Velocity Sales Agent', emoji: '⚡', role: 'High-volume sales, self-serve optimization, quick wins' },
       { name: 'Support Agent', emoji: '🛟', role: 'Customer support, ticket resolution, knowledge base' },
     ],
     'Marketplace': [
       { name: 'Supply Agent', emoji: '📦', role: 'Seller onboarding, inventory management, quality control' },
       { name: 'Demand Agent', emoji: '🛒', role: 'Buyer acquisition, search optimization, trust & safety' },
     ],
     'E-commerce': [
       { name: 'Commerce Agent', emoji: '🛍️', role: 'Catalog management, pricing, promotions, checkout optimization' },
       { name: 'Fulfillment Agent', emoji: '📬', role: 'Order management, shipping, returns, customer service' },
     ],
     'Professional Services': [
       { name: 'Engagement Agent', emoji: '📊', role: 'Client engagements, billing, utilization tracking' },
       { name: 'Talent Agent', emoji: '👤', role: 'Staffing, skills matching, professional development' },
     ],
   }
 
   const coreAgents = [
     { name: 'Finance Agent', emoji: '💰', role: 'Financial analysis, budgeting, revenue forecasting, expense tracking' },
     { name: 'HR Agent', emoji: '👥', role: 'Talent management, team health, culture initiatives, hiring coordination' },
   ]
 
   const selectedIndustryAgents = industryAgents[industry] || [
     { name: 'Operations Agent', emoji: '⚙️', role: 'Process optimization, workflow automation, efficiency tracking' },
   ]
   
   const selectedMarketAgents = marketAgents[market] || [
     { name: 'Sales Agent', emoji: '📈', role: 'Pipeline management, deal tracking, revenue operations' },
     { name: 'Support Agent', emoji: '🛟', role: 'Customer success, ticket management, satisfaction monitoring' },
   ]
 
   return [...baseAgents, ...coreAgents, ...selectedIndustryAgents, ...selectedMarketAgents]
 }