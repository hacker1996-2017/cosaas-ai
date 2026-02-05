 import { useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { useAuth } from '@/contexts/AuthContext';
 import { supabase } from '@/integrations/supabase/client';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { toast } from 'sonner';
 import { Loader2, Building2, Sparkles } from 'lucide-react';
 
// Industry-specific agent configurations
const getAgentsForIndustryMarket = (industry: string, market: string) => {
  const baseAgents = [
    { name: 'Chief of Staff', emoji: '🎯', role: 'Executive coordination, priority management, cross-functional alignment' },
  ];

  // Industry-specific agents
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
  };

  // Market-specific agents
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
  };

  // Core agents that apply to all organizations
  const coreAgents = [
    { name: 'Finance Agent', emoji: '💰', role: 'Financial analysis, budgeting, revenue forecasting, expense tracking' },
    { name: 'HR Agent', emoji: '👥', role: 'Talent management, team health, culture initiatives, hiring coordination' },
  ];

  // Combine agents based on selections
  const selectedIndustryAgents = industryAgents[industry] || [
    { name: 'Operations Agent', emoji: '⚙️', role: 'Process optimization, workflow automation, efficiency tracking' },
  ];
  
  const selectedMarketAgents = marketAgents[market] || [
    { name: 'Sales Agent', emoji: '📈', role: 'Pipeline management, deal tracking, revenue operations' },
    { name: 'Support Agent', emoji: '🛟', role: 'Customer success, ticket management, satisfaction monitoring' },
  ];

  return [...baseAgents, ...coreAgents, ...selectedIndustryAgents, ...selectedMarketAgents];
};

 const industries = [
   'Technology',
   'Healthcare',
   'Finance',
   'Retail',
   'Manufacturing',
   'Education',
   'Real Estate',
   'Consulting',
   'Marketing',
   'Other'
 ];
 
 const markets = [
   'B2B SaaS',
   'B2C',
   'Enterprise',
   'SMB',
   'Marketplace',
   'E-commerce',
   'Professional Services',
   'Other'
 ];
 
 export default function OrganizationSetup() {
   const navigate = useNavigate();
   const { user } = useAuth();
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [companyName, setCompanyName] = useState('');
   const [industry, setIndustry] = useState('');
   const [market, setMarket] = useState('');
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     if (!companyName.trim()) {
       toast.error('Please enter your company name');
       return;
     }
     
     if (!user) {
       toast.error('You must be logged in');
       return;
     }
     
     setIsSubmitting(true);
     
     try {
       // 1. Create the organization
       const { data: org, error: orgError } = await supabase
         .from('organizations')
         .insert({
           name: companyName.trim(),
           industry: industry || null,
           market: market || null,
           autonomy_level: 'draft_actions'
         })
         .select()
         .single();
       
       if (orgError) throw orgError;
       
       // 2. Update user's profile with organization_id
       const { error: profileError } = await supabase
         .from('profiles')
         .update({ organization_id: org.id })
         .eq('id', user.id);
       
       if (profileError) throw profileError;
       
       // 3. Assign CEO role to the user
       const { error: roleError } = await supabase
         .from('user_roles')
         .insert({
           user_id: user.id,
           organization_id: org.id,
           role: 'ceo'
         });
       
       if (roleError) throw roleError;
       
       // 4. Create default AI agents for the organization
       const customAgents = getAgentsForIndustryMarket(industry || 'Other', market || 'Other');
 
       const agentInserts: {
         name: string;
         emoji: string;
         role: string;
         organization_id: string;
         is_system_agent: boolean;
         status: 'available' | 'busy' | 'error' | 'maintenance';
       }[] = customAgents.map(agent => ({
         ...agent,
         organization_id: org.id,
         is_system_agent: true,
         status: 'available' as const
       }));
 
       const { error: agentsError } = await supabase
         .from('agents')
         .insert(agentInserts);
       
       if (agentsError) {
         console.error('Failed to create default agents:', agentsError);
         // Don't throw - agents are nice to have but not critical
       }
       
       toast.success('Organization created successfully! Welcome, CEO.');
       navigate('/', { replace: true });
       
     } catch (error: any) {
       console.error('Organization setup error:', error);
       toast.error(error.message || 'Failed to create organization');
     } finally {
       setIsSubmitting(false);
     }
   };
 
   return (
     <div className="min-h-screen bg-background flex items-center justify-center p-8">
       <Card className="w-full max-w-lg bg-card/50 backdrop-blur border-border">
         <CardHeader className="text-center">
           <div className="flex items-center justify-center gap-2 mb-4">
             <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
               <Sparkles className="w-6 h-6 text-primary" />
             </div>
           </div>
           <CardTitle className="text-2xl">Set Up Your Organization</CardTitle>
           <CardDescription>
             Create your company profile to unlock your AI-powered executive operating system
           </CardDescription>
         </CardHeader>
         <CardContent>
           <form onSubmit={handleSubmit} className="space-y-6">
             <div className="space-y-2">
               <Label htmlFor="company-name" className="flex items-center gap-2">
                 <Building2 className="w-4 h-4" />
                 Company Name *
               </Label>
               <Input
                 id="company-name"
                 type="text"
                 placeholder="Acme Corporation"
                 value={companyName}
                 onChange={(e) => setCompanyName(e.target.value)}
                 disabled={isSubmitting}
                 autoFocus
               />
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="industry">Industry</Label>
               <Select value={industry} onValueChange={setIndustry} disabled={isSubmitting}>
                 <SelectTrigger id="industry">
                   <SelectValue placeholder="Select your industry" />
                 </SelectTrigger>
                 <SelectContent>
                   {industries.map((ind) => (
                     <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             
             <div className="space-y-2">
               <Label htmlFor="market">Market</Label>
               <Select value={market} onValueChange={setMarket} disabled={isSubmitting}>
                 <SelectTrigger id="market">
                   <SelectValue placeholder="Select your market" />
                 </SelectTrigger>
                 <SelectContent>
                   {markets.map((m) => (
                     <SelectItem key={m} value={m}>{m}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
             
             <div className="pt-4">
               <Button 
                 type="submit" 
                 className="w-full" 
                 size="lg"
                 disabled={isSubmitting}
               >
                 {isSubmitting ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Creating your organization...
                   </>
                 ) : (
                   'Launch Your Executive OS'
                 )}
               </Button>
             </div>
             
             <p className="text-xs text-muted-foreground text-center">
               You'll be assigned as the CEO with full administrative access.
               Your 6 AI agents will be initialized automatically.
             </p>
           </form>
         </CardContent>
       </Card>
     </div>
   );
 }