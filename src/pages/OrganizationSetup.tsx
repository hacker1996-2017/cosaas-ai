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
       const defaultAgents = [
         { name: 'Chief of Staff', emoji: '🎯', role: 'Executive coordination, priority management, cross-functional alignment' },
         { name: 'Finance Agent', emoji: '💰', role: 'Financial analysis, budgeting, revenue forecasting, expense tracking' },
         { name: 'HR Agent', emoji: '👥', role: 'Talent management, team health, culture initiatives, hiring coordination' },
         { name: 'Tech Ops Agent', emoji: '⚙️', role: 'Technical infrastructure, system monitoring, DevOps coordination' },
         { name: 'Sales Agent', emoji: '📈', role: 'Pipeline management, deal tracking, revenue operations, client outreach' },
         { name: 'Support Agent', emoji: '🛟', role: 'Customer success, ticket management, satisfaction monitoring' }
       ];
       
       const agentInserts: {
         name: string;
         emoji: string;
         role: string;
         organization_id: string;
         is_system_agent: boolean;
         status: 'available' | 'busy' | 'error' | 'maintenance';
       }[] = defaultAgents.map(agent => ({
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