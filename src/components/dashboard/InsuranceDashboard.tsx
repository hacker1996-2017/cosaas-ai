import { useState } from 'react';
import {
  Shield, DollarSign, FileText, AlertTriangle, Loader2, TrendingUp, Plus,
  Building2, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, Search, Scale
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInsurance } from '@/hooks/useInsurance';
import { useClients } from '@/hooks/useClients';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

interface InsuranceDashboardProps {
  className?: string;
}

export function InsuranceDashboard({ className }: InsuranceDashboardProps) {
  const ins = useInsurance();
  const { clients } = useClients();
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');

  if (ins.isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span>Insurance Operations</span>
        </div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const commissionCollectionRate = ins.kpis.totalCommissions > 0
    ? Math.round((ins.kpis.receivedCommissions / ins.kpis.totalCommissions) * 100)
    : 0;

  return (
    <div className={cn('panel flex flex-col', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span>Insurance Operations</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-2 grid grid-cols-5 h-7">
          <TabsTrigger value="overview" className="text-[10px]">Overview</TabsTrigger>
          <TabsTrigger value="policies" className="text-[10px]">Policies</TabsTrigger>
          <TabsTrigger value="premiums" className="text-[10px]">Premiums</TabsTrigger>
          <TabsTrigger value="commissions" className="text-[10px]">Commissions</TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-[10px]">Recon</TabsTrigger>
        </TabsList>

        {/* ── Overview ────────────────────────────────────────────── */}
        <TabsContent value="overview" className="flex-1 overflow-auto px-3 pb-3">
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <KpiCard icon={FileText} label="Policies" value={ins.kpis.totalPolicies} sub={`${ins.kpis.activePolicies} active`} subColor="text-[hsl(var(--accent-success))]" />
              <KpiCard icon={DollarSign} label="Premiums" value={`$${ins.kpis.totalPremiumValue.toLocaleString()}`} sub={`${ins.kpis.premiumsDue} due`} />
              <div className="p-2.5 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3 h-3 text-[hsl(var(--accent-warning))]" />
                  <span className="text-[10px] text-muted-foreground">Commissions</span>
                </div>
                <p className="text-lg font-bold text-foreground">${ins.kpis.totalCommissions.toLocaleString()}</p>
                <Progress value={commissionCollectionRate} className="h-1 mt-1" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{commissionCollectionRate}% collected</p>
              </div>
              <KpiCard icon={AlertTriangle} iconColor="text-destructive" label="Overdue" value={ins.kpis.premiumsOverdue} sub={`$${ins.kpis.pendingCommissions.toLocaleString()} pending`} subColor="text-destructive" />
            </div>

            {/* Insurers summary */}
            {ins.insurers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Insurers ({ins.kpis.totalInsurers})</p>
                  <CreateInsurerDialog onSubmit={ins.createInsurer} />
                </div>
                <div className="space-y-1">
                  {ins.insurers.slice(0, 5).map((insurer) => (
                    <div key={insurer.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-xs">
                      <span className="text-foreground truncate">{insurer.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{((insurer.commission_rate_default || 0.1) * 100).toFixed(0)}%</span>
                        <span className={cn('w-2 h-2 rounded-full', insurer.is_active ? 'bg-[hsl(var(--accent-success))]' : 'bg-muted-foreground')} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {ins.insurers.length === 0 && (
              <div className="text-center py-4">
                <Building2 className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground mb-2">No insurers yet</p>
                <CreateInsurerDialog onSubmit={ins.createInsurer} />
              </div>
            )}

            {/* Open exceptions alert */}
            {ins.kpis.openExceptions > 0 && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <div>
                  <p className="text-xs font-medium text-destructive">{ins.kpis.openExceptions} Open Exception{ins.kpis.openExceptions > 1 ? 's' : ''}</p>
                  <p className="text-[10px] text-muted-foreground">Review in Reconciliation tab</p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Policies ────────────────────────────────────────────── */}
        <TabsContent value="policies" className="flex-1 overflow-hidden flex flex-col px-3 pb-3">
          <div className="flex items-center gap-2 mt-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input placeholder="Search policies..." className="h-7 text-xs pl-7" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <CreatePolicyDialog clients={clients || []} insurers={ins.insurers} onSubmit={ins.createPolicy} />
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1.5">
              {ins.policies
                .filter(p => !search || p.policy_number.toLowerCase().includes(search.toLowerCase()) || p.policy_type.toLowerCase().includes(search.toLowerCase()))
                .map((policy) => (
                  <div key={policy.id} className="p-2.5 rounded-lg bg-secondary/30 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{policy.policy_number}</p>
                        <p className="text-[10px] text-muted-foreground">{policy.policy_type}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-foreground font-mono">${Number(policy.premium_amount).toLocaleString()}</p>
                        <StatusBadge status={policy.status} />
                      </div>
                    </div>
                    {policy.effective_date && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(new Date(policy.effective_date), 'MMM d, yyyy')}
                        {policy.expiry_date && ` → ${format(new Date(policy.expiry_date), 'MMM d, yyyy')}`}
                      </p>
                    )}
                  </div>
                ))}
              {ins.policies.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No policies yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Premiums ────────────────────────────────────────────── */}
        <TabsContent value="premiums" className="flex-1 overflow-hidden flex flex-col px-3 pb-3">
          <div className="flex items-center justify-between mt-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground">{ins.premiums.length} Premium Records</p>
            <CreatePremiumDialog policies={ins.policies} clients={clients || []} onSubmit={ins.createPremium} />
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1.5">
              {ins.premiums.map((premium) => {
                const policy = ins.policies.find(p => p.id === premium.insurance_policy_id);
                return (
                  <div key={premium.id} className="p-2.5 rounded-lg bg-secondary/30 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{policy?.policy_number || 'Unknown'}</p>
                        <p className="text-[10px] text-muted-foreground">Due: {format(new Date(premium.due_date), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-foreground font-mono">${Number(premium.amount).toLocaleString()}</p>
                        <PremiumStatusBadge status={premium.status} />
                      </div>
                    </div>
                    {premium.paid_amount !== null && Number(premium.paid_amount) > 0 && (
                      <p className="text-[10px] text-[hsl(var(--accent-success))] mt-1">Paid: ${Number(premium.paid_amount).toLocaleString()}</p>
                    )}
                  </div>
                );
              })}
              {ins.premiums.length === 0 && (
                <div className="text-center py-8">
                  <DollarSign className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No premiums recorded</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Commissions ─────────────────────────────────────────── */}
        <TabsContent value="commissions" className="flex-1 overflow-hidden flex flex-col px-3 pb-3">
          <div className="flex items-center justify-between mt-2 mb-2">
            <p className="text-xs font-medium text-muted-foreground">{ins.commissions.length} Commissions</p>
            <CreateCommissionDialog policies={ins.policies} insurers={ins.insurers} onSubmit={ins.createCommission} />
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1.5">
              {ins.commissions.map((commission) => {
                const insurer = ins.insurers.find(i => i.id === commission.insurer_id);
                return (
                  <div key={commission.id} className="p-2.5 rounded-lg bg-secondary/30 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{insurer?.name || 'Unknown Insurer'}</p>
                        <p className="text-[10px] text-muted-foreground">Rate: {(Number(commission.rate) * 100).toFixed(1)}%</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-foreground font-mono">${Number(commission.expected_amount).toLocaleString()}</p>
                        <CommissionStatusBadge status={commission.status} />
                      </div>
                    </div>
                    {commission.received_amount !== null && Number(commission.received_amount) > 0 && (
                      <p className="text-[10px] text-[hsl(var(--accent-success))] mt-1">Received: ${Number(commission.received_amount).toLocaleString()}</p>
                    )}
                  </div>
                );
              })}
              {ins.commissions.length === 0 && (
                <div className="text-center py-8">
                  <TrendingUp className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No commissions recorded</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Reconciliation ──────────────────────────────────────── */}
        <TabsContent value="reconciliation" className="flex-1 overflow-hidden flex flex-col px-3 pb-3">
          <div className="flex items-center gap-2 mt-2 mb-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => ins.runReconciliation({ batch_type: 'premium' })}
              disabled={ins.isReconciling}
            >
              {ins.isReconciling ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Scale className="w-3 h-3 mr-1" />}
              Premium Recon
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[10px]"
              onClick={() => ins.runReconciliation({ batch_type: 'commission' })}
              disabled={ins.isReconciling}
            >
              {ins.isReconciling ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Commission Recon
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-3">
              {/* Recent batches */}
              {ins.reconciliationBatches.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Recent Batches</p>
                  <div className="space-y-1.5">
                    {ins.reconciliationBatches.slice(0, 5).map((batch) => (
                      <div key={batch.id} className="p-2.5 rounded-lg bg-secondary/30 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground font-medium capitalize">{batch.batch_type} Reconciliation</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(batch.created_at), 'MMM d, HH:mm')}</p>
                          </div>
                          <Badge variant={batch.status === 'completed' ? 'default' : batch.status === 'processing' ? 'secondary' : 'destructive'} className="text-[9px] h-4">
                            {batch.status}
                          </Badge>
                        </div>
                        {batch.status === 'completed' && (
                          <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                            <div><span className="text-muted-foreground">Records:</span> <span className="text-foreground font-medium">{batch.total_records}</span></div>
                            <div><span className="text-muted-foreground">Matched:</span> <span className="text-[hsl(var(--accent-success))] font-medium">{batch.matched_count}</span></div>
                            <div><span className="text-muted-foreground">Exceptions:</span> <span className="text-destructive font-medium">{batch.exception_count}</span></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Exceptions */}
              {ins.reconciliationExceptions.filter(e => e.status === 'exception').length > 0 && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1.5">Open Exceptions</p>
                  <div className="space-y-1.5">
                    {ins.reconciliationExceptions
                      .filter(e => e.status === 'exception')
                      .map((exc) => (
                        <div key={exc.id} className="p-2.5 rounded-lg bg-destructive/5 border border-destructive/15 text-xs">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-foreground font-medium capitalize">{exc.exception_type.replace(/_/g, ' ')}</p>
                              <p className="text-[10px] text-muted-foreground">
                                Expected: ${Number(exc.expected_amount || 0).toLocaleString()} · Actual: ${Number(exc.actual_amount || 0).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px]"
                              onClick={() => ins.resolveException({ id: exc.id, notes: 'Reviewed and resolved' })}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Resolve
                            </Button>
                          </div>
                          {exc.discrepancy !== null && Number(exc.discrepancy) > 0 && (
                            <p className="text-[10px] text-destructive mt-1 font-medium">Discrepancy: ${Number(exc.discrepancy).toLocaleString()}</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {ins.reconciliationBatches.length === 0 && (
                <div className="text-center py-8">
                  <Scale className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">No reconciliation batches yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Run a reconciliation above</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function KpiCard({ icon: Icon, iconColor, label, value, sub, subColor }: {
  icon: React.ElementType; iconColor?: string; label: string;
  value: string | number; sub?: string; subColor?: string;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-secondary/50">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('w-3 h-3', iconColor || 'text-primary')} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {sub && <p className={cn('text-[10px]', subColor || 'text-muted-foreground')}>{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-[hsl(var(--accent-success))]/15 text-[hsl(var(--accent-success))]',
    draft: 'bg-secondary text-muted-foreground',
    expired: 'bg-destructive/15 text-destructive',
    cancelled: 'bg-destructive/15 text-destructive',
    pending_renewal: 'bg-[hsl(var(--accent-warning))]/15 text-[hsl(var(--accent-warning))]',
  };
  return <span className={cn('text-[9px] px-1.5 py-0.5 rounded capitalize font-medium', colors[status] || 'bg-secondary text-muted-foreground')}>{status}</span>;
}

function PremiumStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: 'bg-[hsl(var(--accent-success))]/15 text-[hsl(var(--accent-success))]',
    due: 'bg-[hsl(var(--accent-warning))]/15 text-[hsl(var(--accent-warning))]',
    overdue: 'bg-destructive/15 text-destructive',
    waived: 'bg-secondary text-muted-foreground',
    refunded: 'bg-primary/15 text-primary',
  };
  return <span className={cn('text-[9px] px-1.5 py-0.5 rounded capitalize font-medium', colors[status] || 'bg-secondary text-muted-foreground')}>{status}</span>;
}

function CommissionStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    received: 'bg-[hsl(var(--accent-success))]/15 text-[hsl(var(--accent-success))]',
    pending: 'bg-[hsl(var(--accent-warning))]/15 text-[hsl(var(--accent-warning))]',
    disputed: 'bg-destructive/15 text-destructive',
  };
  return <span className={cn('text-[9px] px-1.5 py-0.5 rounded capitalize font-medium', colors[status] || 'bg-secondary text-muted-foreground')}>{status}</span>;
}

// ── Create Dialogs ─────────────────────────────────────────────────────

function CreateInsurerDialog({ onSubmit }: { onSubmit: (data: any) => Promise<any> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [rate, setRate] = useState('10');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), code: code.trim() || null, commission_rate_default: parseFloat(rate) / 100, contact_email: email.trim() || null });
      setOpen(false);
      setName(''); setCode(''); setRate('10'); setEmail('');
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-6 text-[10px]"><Plus className="w-3 h-3 mr-1" />Add Insurer</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-sm">Add Insurer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="text-xs">Name *</Label><Input className="h-8 text-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AIG" /></div>
          <div><Label className="text-xs">Code</Label><Input className="h-8 text-xs" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. AIG" /></div>
          <div><Label className="text-xs">Default Commission Rate (%)</Label><Input className="h-8 text-xs" type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          <div><Label className="text-xs">Contact Email</Label><Input className="h-8 text-xs" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@insurer.com" /></div>
          <Button className="w-full h-8 text-xs" onClick={handleSubmit} disabled={submitting || !name.trim()}>
            {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Create Insurer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreatePolicyDialog({ clients, insurers, onSubmit }: { clients: any[]; insurers: any[]; onSubmit: (data: any) => Promise<any> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ client_id: '', insurer_id: '', policy_number: '', policy_type: '', premium_amount: '', effective_date: '', expiry_date: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.client_id || !form.policy_number || !form.policy_type || !form.premium_amount) return;
    setSubmitting(true);
    try {
      await onSubmit({
        client_id: form.client_id,
        insurer_id: form.insurer_id || null,
        policy_number: form.policy_number,
        policy_type: form.policy_type,
        premium_amount: parseFloat(form.premium_amount),
        effective_date: form.effective_date || null,
        expiry_date: form.expiry_date || null,
        status: 'draft' as const,
      });
      setOpen(false);
      setForm({ client_id: '', insurer_id: '', policy_number: '', policy_type: '', premium_amount: '', effective_date: '', expiry_date: '' });
    } finally { setSubmitting(false); }
  };

  const policyTypes = ['Auto', 'Home', 'Life', 'Health', 'Commercial', 'Liability', 'Property', 'Workers Comp', 'Marine', 'Other'];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"><Plus className="w-3 h-3 mr-1" />New Policy</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="text-sm">Create Policy</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <Label className="text-xs">Client *</Label>
            <Select value={form.client_id} onValueChange={(v) => setForm(f => ({ ...f, client_id: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select client" /></SelectTrigger>
              <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Insurer</Label>
            <Select value={form.insurer_id} onValueChange={(v) => setForm(f => ({ ...f, insurer_id: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select insurer" /></SelectTrigger>
              <SelectContent>{insurers.map(i => <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Policy Number *</Label><Input className="h-8 text-xs" value={form.policy_number} onChange={(e) => setForm(f => ({ ...f, policy_number: e.target.value }))} placeholder="POL-2026-001" /></div>
          <div>
            <Label className="text-xs">Policy Type *</Label>
            <Select value={form.policy_type} onValueChange={(v) => setForm(f => ({ ...f, policy_type: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>{policyTypes.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Premium Amount *</Label><Input className="h-8 text-xs" type="number" value={form.premium_amount} onChange={(e) => setForm(f => ({ ...f, premium_amount: e.target.value }))} placeholder="5000" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label className="text-xs">Effective Date</Label><Input className="h-8 text-xs" type="date" value={form.effective_date} onChange={(e) => setForm(f => ({ ...f, effective_date: e.target.value }))} /></div>
            <div><Label className="text-xs">Expiry Date</Label><Input className="h-8 text-xs" type="date" value={form.expiry_date} onChange={(e) => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
          </div>
          <Button className="w-full h-8 text-xs" onClick={handleSubmit} disabled={submitting || !form.client_id || !form.policy_number}>
            {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Create Policy
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreatePremiumDialog({ policies, clients, onSubmit }: { policies: any[]; clients: any[]; onSubmit: (data: any) => Promise<any> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ insurance_policy_id: '', amount: '', due_date: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.insurance_policy_id || !form.amount || !form.due_date) return;
    const policy = policies.find(p => p.id === form.insurance_policy_id);
    setSubmitting(true);
    try {
      await onSubmit({
        insurance_policy_id: form.insurance_policy_id,
        client_id: policy?.client_id,
        amount: parseFloat(form.amount),
        due_date: form.due_date,
      });
      setOpen(false);
      setForm({ insurance_policy_id: '', amount: '', due_date: '' });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"><Plus className="w-3 h-3 mr-1" />Record Premium</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-sm">Record Premium</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Policy *</Label>
            <Select value={form.insurance_policy_id} onValueChange={(v) => setForm(f => ({ ...f, insurance_policy_id: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select policy" /></SelectTrigger>
              <SelectContent>{policies.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.policy_number} — ${Number(p.premium_amount).toLocaleString()}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Amount *</Label><Input className="h-8 text-xs" type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
          <div><Label className="text-xs">Due Date *</Label><Input className="h-8 text-xs" type="date" value={form.due_date} onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
          <Button className="w-full h-8 text-xs" onClick={handleSubmit} disabled={submitting || !form.insurance_policy_id}>
            {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Record Premium
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateCommissionDialog({ policies, insurers, onSubmit }: { policies: any[]; insurers: any[]; onSubmit: (data: any) => Promise<any> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ insurance_policy_id: '', insurer_id: '', rate: '10', expected_amount: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.insurance_policy_id || !form.insurer_id || !form.expected_amount) return;
    setSubmitting(true);
    try {
      await onSubmit({
        insurance_policy_id: form.insurance_policy_id,
        insurer_id: form.insurer_id,
        rate: parseFloat(form.rate) / 100,
        expected_amount: parseFloat(form.expected_amount),
      });
      setOpen(false);
      setForm({ insurance_policy_id: '', insurer_id: '', rate: '10', expected_amount: '' });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"><Plus className="w-3 h-3 mr-1" />Record Commission</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-sm">Record Commission</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Policy *</Label>
            <Select value={form.insurance_policy_id} onValueChange={(v) => setForm(f => ({ ...f, insurance_policy_id: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select policy" /></SelectTrigger>
              <SelectContent>{policies.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.policy_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Insurer *</Label>
            <Select value={form.insurer_id} onValueChange={(v) => setForm(f => ({ ...f, insurer_id: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select insurer" /></SelectTrigger>
              <SelectContent>{insurers.map(i => <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">Rate (%)</Label><Input className="h-8 text-xs" type="number" value={form.rate} onChange={(e) => setForm(f => ({ ...f, rate: e.target.value }))} /></div>
          <div><Label className="text-xs">Expected Amount *</Label><Input className="h-8 text-xs" type="number" value={form.expected_amount} onChange={(e) => setForm(f => ({ ...f, expected_amount: e.target.value }))} /></div>
          <Button className="w-full h-8 text-xs" onClick={handleSubmit} disabled={submitting || !form.insurance_policy_id || !form.insurer_id}>
            {submitting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}Record Commission
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
