import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Building2, Shield, Bell, Palette, Database, Key, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database as DbType } from '@/integrations/supabase/types';

type AutonomyLevel = DbType['public']['Enums']['autonomy_level'];

const autonomyLabels: Record<string, { label: string; desc: string; color: string }> = {
  observe_only: { label: 'Observe Only', desc: 'AI monitors but never acts', color: 'text-muted-foreground' },
  recommend: { label: 'Recommend', desc: 'AI suggests actions for your approval', color: 'text-primary' },
  draft_actions: { label: 'Draft Actions', desc: 'AI drafts actions, you review before execution', color: 'text-[hsl(var(--accent-warning))]' },
  execute_with_approval: { label: 'Execute with Approval', desc: 'AI executes low-risk actions, high-risk needs approval', color: 'text-[hsl(var(--accent-warning))]' },
  execute_autonomous: { label: 'Fully Autonomous', desc: 'AI executes all actions within policy bounds', color: 'text-[hsl(var(--accent-success))]' },
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { organization, updateOrganization, updateAutonomyLevel, isUpdating } = useOrganization();
  const { profile } = useUserProfile();

  // Profile state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [savingProfile, setSavingProfile] = useState(false);

  // Org state
  const [orgName, setOrgName] = useState('');
  const [industry, setIndustry] = useState('');
  const [market, setMarket] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);

  // Security
  const [maxActions, setMaxActions] = useState('100');
  const [maxConcurrent, setMaxConcurrent] = useState('10');

  // Hydrate profile data when loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setTimezone(profile.timezone || 'UTC');
    }
  }, [profile]);

  // Hydrate org data when loaded
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '');
      setIndustry(organization.industry || '');
      setMarket(organization.market || '');
      setMaxActions(organization.max_actions_per_hour?.toString() || '100');
      setMaxConcurrent(organization.max_concurrent_actions?.toString() || '10');
    }
  }, [organization]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, phone, timezone, last_active_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveOrg = async () => {
    setSavingOrg(true);
    try {
      await updateOrganization({ name: orgName, industry, market });
      toast.success('Organization updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update organization');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleSaveGovernance = async () => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          max_actions_per_hour: parseInt(maxActions) || 100,
          max_concurrent_actions: parseInt(maxConcurrent) || 10,
        })
        .eq('id', organization!.id);
      if (error) throw error;
      toast.success('Governance limits updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update governance');
    }
  };

  const handleChangePassword = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user?.email || '', {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      toast.success('Password reset email sent — check your inbox');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const getInitials = (name: string) => name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border/40 backdrop-blur-xl shrink-0 flex items-center px-5 gap-3"
        style={{ background: 'linear-gradient(180deg, hsl(222 47% 8% / 0.95) 0%, hsl(222 47% 6% / 0.9) 100%)' }}>
        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-sm font-bold text-foreground">Settings</h1>
          <p className="text-[10px] text-muted-foreground">Manage your profile, organization, and system configuration</p>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full h-10 bg-secondary/50 mb-6">
              <TabsTrigger value="profile" className="text-xs flex-1 gap-1.5">
                <User className="w-3.5 h-3.5" /> Profile
              </TabsTrigger>
              <TabsTrigger value="organization" className="text-xs flex-1 gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Organization
              </TabsTrigger>
              <TabsTrigger value="governance" className="text-xs flex-1 gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Governance
              </TabsTrigger>
              <TabsTrigger value="system" className="text-xs flex-1 gap-1.5">
                <Database className="w-3.5 h-3.5" /> System
              </TabsTrigger>
            </TabsList>

            {/* ═══ PROFILE TAB ═══ */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base">Your Profile</CardTitle>
                  <CardDescription>Manage your personal information and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 ring-2 ring-border/50">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="text-lg font-bold" style={{
                        background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.2), hsl(217 91% 60% / 0.05))',
                        color: 'hsl(217 91% 70%)',
                      }}>
                        {getInitials(fullName || user?.email || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{fullName || 'Set your name'}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <Badge variant="outline" className="mt-1 text-[9px] border-primary/30 text-primary">CEO</Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Full Name</Label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Email</Label>
                      <Input value={user?.email || ''} disabled className="h-9 text-sm opacity-60" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Phone</Label>
                      <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="h-9 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Timezone</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                          <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                          <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                          <SelectItem value="Europe/London">London (GMT)</SelectItem>
                          <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                          <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                          <SelectItem value="Africa/Nairobi">Nairobi (EAT)</SelectItem>
                          <SelectItem value="Africa/Johannesburg">Johannesburg (SAST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <Button variant="outline" size="sm" onClick={handleChangePassword} className="text-xs">
                      <Key className="w-3.5 h-3.5 mr-1.5" /> Change Password
                    </Button>
                    <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile} className="text-xs">
                      {savingProfile ? 'Saving...' : 'Save Profile'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Sign out of all devices</p>
                    <p className="text-xs text-muted-foreground">This will terminate all active sessions</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleSignOut} className="text-xs">Sign Out</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ ORGANIZATION TAB ═══ */}
            <TabsContent value="organization" className="space-y-6">
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base">Organization Details</CardTitle>
                  <CardDescription>Configure your company information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Company Name</Label>
                      <Input value={orgName} onChange={e => setOrgName(e.target.value)} className="h-9 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Industry</Label>
                      <Select value={industry} onValueChange={setIndustry}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select industry" /></SelectTrigger>
                        <SelectContent>
                          {['Technology', 'Finance', 'Healthcare', 'Insurance', 'Real Estate', 'Education', 'Manufacturing', 'Retail', 'Legal', 'Consulting'].map(i => (
                            <SelectItem key={i} value={i}>{i}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Market</Label>
                      <Select value={market} onValueChange={setMarket}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select market" /></SelectTrigger>
                        <SelectContent>
                          {['B2B SaaS', 'B2C', 'B2B Enterprise', 'B2B2C', 'Marketplace', 'D2C'].map(m => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Organization ID</Label>
                      <Input value={organization?.id || ''} disabled className="h-9 text-sm font-mono text-[10px] opacity-50" />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={handleSaveOrg} disabled={savingOrg} className="text-xs">
                      {savingOrg ? 'Saving...' : 'Save Organization'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Org Stats */}
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base">Organization Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Kill Switch', value: organization?.kill_switch_active ? 'ACTIVE' : 'OFF', color: organization?.kill_switch_active ? 'text-destructive' : 'text-[hsl(var(--accent-success))]' },
                      { label: 'Autonomy', value: autonomyLabels[organization?.autonomy_level || 'draft_actions']?.label || 'Draft', color: autonomyLabels[organization?.autonomy_level || 'draft_actions']?.color },
                      { label: 'Actions/Hour', value: `${organization?.actions_this_hour || 0}/${organization?.max_actions_per_hour || 100}`, color: 'text-primary' },
                      { label: 'Created', value: organization?.created_at ? new Date(organization.created_at).toLocaleDateString() : '-', color: 'text-muted-foreground' },
                    ].map(stat => (
                      <div key={stat.label} className="space-y-1">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{stat.label}</p>
                        <p className={`text-sm font-bold font-[JetBrains_Mono] ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ═══ GOVERNANCE TAB ═══ */}
            <TabsContent value="governance" className="space-y-6">
              {/* Autonomy Level */}
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base">AI Autonomy Level</CardTitle>
                  <CardDescription>Control how much authority AI agents have</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(Object.entries(autonomyLabels) as [string, typeof autonomyLabels[string]][]).map(([key, { label, desc, color }]) => (
                    <div
                      key={key}
                      onClick={() => updateAutonomyLevel(key as AutonomyLevel)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        organization?.autonomy_level === key
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border/30 hover:border-border/60 hover:bg-secondary/30'
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-semibold ${color}`}>{label}</p>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        organization?.autonomy_level === key
                          ? 'border-primary bg-primary'
                          : 'border-border/50'
                      }`} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Rate Limits */}
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base">Rate Limits & Safety</CardTitle>
                  <CardDescription>Configure operational guardrails for AI agents</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Max Actions per Hour</Label>
                      <Input type="number" value={maxActions} onChange={e => setMaxActions(e.target.value)} className="h-9 text-sm font-mono" />
                      <p className="text-[10px] text-muted-foreground">Current usage: {organization?.actions_this_hour || 0}</p>
                      <Progress value={((organization?.actions_this_hour || 0) / (parseInt(maxActions) || 100)) * 100} className="h-1.5" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max Concurrent Actions</Label>
                      <Input type="number" value={maxConcurrent} onChange={e => setMaxConcurrent(e.target.value)} className="h-9 text-sm font-mono" />
                      <p className="text-[10px] text-muted-foreground">Parallel execution limit</p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button size="sm" onClick={handleSaveGovernance} className="text-xs">Save Limits</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Kill Switch Info */}
              <Card className={`border-border/40 ${organization?.kill_switch_active ? 'border-destructive/40 bg-destructive/5' : ''}`}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Kill Switch
                    <Badge variant={organization?.kill_switch_active ? 'destructive' : 'outline'} className="text-[9px] ml-auto">
                      {organization?.kill_switch_active ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {organization?.kill_switch_active
                      ? 'All AI agent actions are currently halted. Go to the Control panel to deactivate.'
                      : 'The kill switch immediately halts all AI agent execution. Use the Control panel to activate if needed.'}
                  </CardDescription>
                </CardHeader>
              </Card>
            </TabsContent>

            {/* ═══ SYSTEM TAB ═══ */}
            <TabsContent value="system" className="space-y-6">
              {/* Notification Preferences */}
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4" /> Notifications
                  </CardTitle>
                  <CardDescription>Configure how and when you receive alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Decision Approvals', desc: 'Notify when AI decisions need your approval', defaultOn: true },
                    { label: 'High-Risk Alerts', desc: 'Critical risk events and kill switch triggers', defaultOn: true },
                    { label: 'Agent Status Changes', desc: 'When agents go offline or encounter errors', defaultOn: true },
                    { label: 'Client Churn Warnings', desc: 'Early warnings for clients at risk of churning', defaultOn: true },
                    { label: 'Email Delivery Reports', desc: 'Notifications when emails are sent or fail', defaultOn: false },
                    { label: 'Reconciliation Alerts', desc: 'Insurance reconciliation exceptions', defaultOn: true },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch defaultChecked={item.defaultOn} />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* System Info */}
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4" /> System Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Platform', value: 'Chief of Staff AI v5.0' },
                      { label: 'Architecture', value: 'Level 5 — Autonomous' },
                      { label: 'Edge Functions', value: '15 deployed' },
                      { label: 'Database Tables', value: '28+ tables' },
                      { label: 'Realtime', value: 'WebSocket streaming' },
                      { label: 'Security', value: 'RLS + RBAC enforced' },
                    ].map(item => (
                      <div key={item.label} className="space-y-0.5">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</p>
                        <p className="text-xs font-medium text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Integrations Summary */}
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle className="text-base">Edge Functions Status</CardTitle>
                  <CardDescription>All backend functions are auto-deployed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      'process-command', 'execute-decision', 'evaluate-action',
                      'dispatch-action', 'send-email', 'ai-email',
                      'triage-inbound', 'process-document', 'execute-workflow',
                      'agent-scheduler', 'reconcile-insurance', 'integration-sync',
                      'devops-agent', 'create-organization', 'resend-webhook',
                    ].map(fn => (
                      <div key={fn} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/20">
                        <div className="w-2 h-2 rounded-full bg-[hsl(var(--accent-success))]" />
                        <span className="text-[9px] font-mono text-muted-foreground truncate">{fn}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
