import { useState, useMemo } from 'react';
import {
  Search, TrendingUp, TrendingDown, BarChart3, Edit2,
  Loader2, UserPlus, Mail, Phone, Building, Eye, Filter,
  LayoutList, Columns, DollarSign, AlertTriangle, Users,
  Activity, ChevronRight, Tag, X, Heart, Shield
} from 'lucide-react';
import { ClientDetailView } from './ClientDetailView';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/useClients';
import { Database } from '@/integrations/supabase/types';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientStatus = Database['public']['Enums']['client_status'];
type ClientType = Database['public']['Enums']['client_type'];
type RiskLevel = Database['public']['Enums']['risk_level'];

const statusConfig: Record<ClientStatus, { label: string; class: string; color: string }> = {
  prospect: { label: 'Prospect', class: 'bg-primary/15 text-primary border border-primary/20', color: 'hsl(var(--primary))' },
  onboarding: { label: 'Onboarding', class: 'badge-warning', color: 'hsl(var(--accent-warning))' },
  active: { label: 'Active', class: 'badge-success', color: 'hsl(var(--accent-success))' },
  paused: { label: 'Paused', class: 'bg-secondary/60 text-muted-foreground border border-border/30', color: 'hsl(var(--muted-foreground))' },
  churned: { label: 'Churned', class: 'badge-danger', color: 'hsl(var(--destructive))' },
};

const riskConfig: Record<RiskLevel, { label: string; class: string }> = {
  low: { label: 'Low', class: 'badge-success' },
  medium: { label: 'Medium', class: 'badge-warning' },
  high: { label: 'High', class: 'badge-danger' },
  critical: { label: 'Critical', class: 'badge-danger' },
};

const PIPELINE_ORDER: ClientStatus[] = ['prospect', 'onboarding', 'active', 'paused', 'churned'];

interface InternalCRMProps {
  className?: string;
}

export function InternalCRM({ className }: InternalCRMProps) {
  const { clients, isLoading, createClient, isCreating, updateClient } = useClients();
  const [search, setSearch] = useState('');
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  // Form state
  const emptyForm = {
    name: '', company: '', email: '', phone: '', industry: '',
    client_type: 'smb' as ClientType, status: 'prospect' as ClientStatus,
    mrr: 0, primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '',
    tags: '' as string,
  };
  const [form, setForm] = useState(emptyForm);

  // Filtering
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      if (search) {
        const s = search.toLowerCase();
        const match = c.name.toLowerCase().includes(s) ||
          c.company?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.industry?.toLowerCase().includes(s) ||
          c.tags?.some(t => t.toLowerCase().includes(s));
        if (!match) return false;
      }
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterType !== 'all' && c.client_type !== filterType) return false;
      if (filterRisk !== 'all' && c.risk_of_churn !== filterRisk) return false;
      return true;
    });
  }, [clients, search, filterStatus, filterType, filterRisk]);

  // Stats
  const stats = useMemo(() => {
    const totalMRR = clients.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0);
    const active = clients.filter(c => c.status === 'active').length;
    const atRisk = clients.filter(c => c.risk_of_churn === 'high' || c.risk_of_churn === 'critical').length;
    const avgHealth = clients.length > 0
      ? Math.round(clients.reduce((sum, c) => sum + ((c as any).health_score || 75), 0) / clients.length)
      : 0;
    return { total: clients.length, active, totalMRR, atRisk, avgHealth };
  }, [clients]);

  // Pipeline groups
  const pipelineGroups = useMemo(() => {
    const groups: Record<string, Client[]> = {};
    PIPELINE_ORDER.forEach(status => { groups[status] = []; });
    filteredClients.forEach(c => {
      const status = c.status || 'prospect';
      if (groups[status]) groups[status].push(c);
    });
    return groups;
  }, [filteredClients]);

  const hasActiveFilters = filterStatus !== 'all' || filterType !== 'all' || filterRisk !== 'all';

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Client name is required'); return; }
    try {
      await createClient({
        name: form.name.trim(),
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        industry: form.industry.trim() || null,
        client_type: form.client_type,
        status: form.status,
        mrr: form.mrr,
        primary_contact_name: form.primary_contact_name.trim() || null,
        primary_contact_email: form.primary_contact_email.trim() || null,
        primary_contact_phone: form.primary_contact_phone.trim() || null,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      });
      toast.success('Client created');
      setIsCreateOpen(false);
      setForm(emptyForm);
    } catch { toast.error('Failed to create client'); }
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      company: client.company || '',
      email: client.email || '',
      phone: client.phone || '',
      industry: client.industry || '',
      client_type: client.client_type || 'smb',
      status: client.status || 'prospect',
      mrr: Number(client.mrr) || 0,
      primary_contact_name: client.primary_contact_name || '',
      primary_contact_email: client.primary_contact_email || '',
      primary_contact_phone: client.primary_contact_phone || '',
      tags: client.tags?.join(', ') || '',
    });
    setIsEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editingClient || !form.name.trim()) { toast.error('Client name is required'); return; }
    try {
      await updateClient({
        id: editingClient.id,
        updates: {
          name: form.name.trim(),
          company: form.company.trim() || null,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          industry: form.industry.trim() || null,
          client_type: form.client_type,
          status: form.status,
          mrr: form.mrr,
          primary_contact_name: form.primary_contact_name.trim() || null,
          primary_contact_email: form.primary_contact_email.trim() || null,
          primary_contact_phone: form.primary_contact_phone.trim() || null,
          tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        },
      });
      toast.success('Client updated');
      setIsEditOpen(false);
      setEditingClient(null);
      setForm(emptyForm);
    } catch { toast.error('Failed to update client'); }
  };

  const handleQuickStatusChange = async (client: Client, newStatus: ClientStatus) => {
    try {
      await updateClient({ id: client.id, updates: { status: newStatus } });
      toast.success(`${client.name} → ${statusConfig[newStatus].label}`);
    } catch { toast.error('Failed to update status'); }
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Internal CRM</div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // ── Detail view ──
  if (detailClient) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Internal CRM</div>
        <div className="p-3">
          <ClientDetailView client={detailClient} onBack={() => setDetailClient(null)} />
        </div>
      </div>
    );
  }

  // ── Client Form Dialog ──
  const renderForm = (isEdit: boolean) => (
    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Client Name *</Label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Company</Label>
          <Input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" className="h-9" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@acme.com" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 123 4567" className="h-9" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={form.client_type} onValueChange={v => setForm({ ...form, client_type: v as ClientType })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="startup">Startup</SelectItem>
              <SelectItem value="smb">SMB</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as ClientStatus })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PIPELINE_ORDER.map(s => (
                <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">MRR ($)</Label>
          <Input type="number" value={form.mrr} onChange={e => setForm({ ...form, mrr: Number(e.target.value) })} className="h-9" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Industry</Label>
        <Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} placeholder="Technology, Finance, Healthcare..." className="h-9" />
      </div>

      {/* Primary Contact */}
      <div className="border-t border-border/30 pt-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Primary Contact</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Name</Label>
            <Input value={form.primary_contact_name} onChange={e => setForm({ ...form, primary_contact_name: e.target.value })} placeholder="Jane Smith" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input value={form.primary_contact_email} onChange={e => setForm({ ...form, primary_contact_email: e.target.value })} placeholder="jane@acme.com" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Phone</Label>
            <Input value={form.primary_contact_phone} onChange={e => setForm({ ...form, primary_contact_phone: e.target.value })} placeholder="+1 555 987 6543" className="h-9" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Tags (comma-separated)</Label>
        <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="vip, enterprise, renewal-q4" className="h-9" />
      </div>
    </div>
  );

  // ── Client Card ──
  const renderClientCard = (client: Client, compact = false) => (
    <div
      key={client.id}
      className={cn(
        'p-3 rounded-lg bg-secondary/40 border border-border/20 cursor-pointer transition-all',
        'hover:bg-secondary/70 hover:border-primary/20 hover:shadow-sm group'
      )}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="min-w-0 flex-1" onClick={() => setDetailClient(client)}>
          <h4 className="text-sm font-semibold text-foreground truncate">{client.name}</h4>
          <p className="text-[11px] text-muted-foreground truncate">
            {client.company || 'No company'}{client.industry ? ` • ${client.industry}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button
            size="sm" variant="ghost"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); openEdit(client); }}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setDetailClient(client); }}
          >
            <Eye className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Metrics row */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-bold text-foreground">
          ${(Number(client.mrr) || 0).toLocaleString()}<span className="text-[10px] font-normal text-muted-foreground">/mo</span>
        </span>
        {!compact && (
          <>
            <span className="text-border">•</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded', riskConfig[client.risk_of_churn || 'low'].class)}>
              {riskConfig[client.risk_of_churn || 'low'].label} Risk
            </span>
          </>
        )}
        {client.expansion_opportunity === 'high' && (
          <TrendingUp className="w-3 h-3 text-[hsl(var(--accent-success))]" />
        )}
      </div>

      {/* Status + Type */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded capitalize', statusConfig[client.status || 'prospect'].class)}>
          {statusConfig[client.status || 'prospect'].label}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/20 capitalize">
          {client.client_type}
        </span>
        {client.tags?.slice(0, 2).map((tag, i) => (
          <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary">{tag}</span>
        ))}
        {(client.tags?.length || 0) > 2 && (
          <span className="text-[9px] text-muted-foreground">+{(client.tags?.length || 0) - 2}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('panel', className)}>
      {/* Header */}
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-primary" />
          <span>Internal CRM</span>
          <span className="text-[10px] text-muted-foreground font-mono">{stats.total}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          <div className="flex rounded-md border border-border/40 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1 transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={cn('p-1 transition-colors', viewMode === 'pipeline' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={v => { setIsCreateOpen(v); if (!v) setForm(emptyForm); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <UserPlus className="w-3 h-3 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>Create a new client record.</DialogDescription>
              </DialogHeader>
              {renderForm(false)}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Client
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-secondary/40 text-center border border-border/10">
            <Users className="w-3 h-3 mx-auto text-primary mb-0.5" />
            <p className="text-sm font-bold text-foreground">{stats.active}</p>
            <p className="text-[9px] text-muted-foreground">Active</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/40 text-center border border-border/10">
            <DollarSign className="w-3 h-3 mx-auto text-[hsl(var(--accent-success))] mb-0.5" />
            <p className="text-sm font-bold text-foreground">${stats.totalMRR >= 1000 ? `${(stats.totalMRR / 1000).toFixed(1)}K` : stats.totalMRR}</p>
            <p className="text-[9px] text-muted-foreground">MRR</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/40 text-center border border-border/10">
            <Heart className="w-3 h-3 mx-auto text-primary mb-0.5" />
            <p className="text-sm font-bold text-foreground">{stats.avgHealth}%</p>
            <p className="text-[9px] text-muted-foreground">Health</p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/40 text-center border border-border/10">
            <AlertTriangle className="w-3 h-3 mx-auto text-destructive mb-0.5" />
            <p className="text-sm font-bold text-foreground">{stats.atRisk}</p>
            <p className="text-[9px] text-muted-foreground">At Risk</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, company, industry, tags..."
              className="pl-9 h-8 text-xs bg-secondary/50 border-border/20"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-7 w-auto min-w-[90px] text-[11px] bg-secondary/40 border-border/20">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {PIPELINE_ORDER.map(s => <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-7 w-auto min-w-[80px] text-[11px] bg-secondary/40 border-border/20">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="startup">Startup</SelectItem>
                <SelectItem value="smb">SMB</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRisk} onValueChange={setFilterRisk}>
              <SelectTrigger className="h-7 w-auto min-w-[80px] text-[11px] bg-secondary/40 border-border/20">
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                size="sm" variant="ghost" className="h-7 text-[10px] px-2 text-destructive"
                onClick={() => { setFilterStatus('all'); setFilterType('all'); setFilterRisk('all'); }}
              >
                <X className="w-3 h-3 mr-0.5" /> Clear
              </Button>
            )}
            <span className="text-[10px] text-muted-foreground ml-auto">
              {filteredClients.length} result{filteredClients.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'list' ? (
          <ScrollArea className="h-[calc(100%-12rem)]" style={{ minHeight: '200px', maxHeight: '360px' }}>
            <div className="space-y-2">
              {filteredClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <UserPlus className="w-8 h-8 text-muted-foreground mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">
                    {clients.length === 0 ? 'No clients yet' : 'No clients match filters'}
                  </p>
                </div>
              ) : (
                filteredClients.map(client => renderClientCard(client))
              )}
            </div>
          </ScrollArea>
        ) : (
          /* Pipeline View */
          <ScrollArea className="h-[calc(100%-12rem)]" style={{ minHeight: '200px', maxHeight: '360px' }}>
            <div className="flex gap-2 min-w-max pb-2">
              {PIPELINE_ORDER.map(status => (
                <div key={status} className="w-44 shrink-0">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: statusConfig[status].color }}
                      />
                      <span className="text-[11px] font-semibold text-foreground">
                        {statusConfig[status].label}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {pipelineGroups[status]?.length || 0}
                    </span>
                  </div>
                  <div className="space-y-1.5 min-h-[60px] p-1.5 rounded-lg bg-secondary/20 border border-border/10">
                    {(pipelineGroups[status] || []).map(client => (
                      <div
                        key={client.id}
                        className="p-2 rounded-md bg-background border border-border/20 cursor-pointer hover:border-primary/30 transition-all group"
                        onClick={() => setDetailClient(client)}
                      >
                        <p className="text-[11px] font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{client.company || client.client_type}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[10px] font-bold text-foreground">
                            ${(Number(client.mrr) || 0).toLocaleString()}
                          </span>
                          <span className={cn('text-[9px] px-1 py-0.5 rounded', riskConfig[client.risk_of_churn || 'low'].class)}>
                            {(client.risk_of_churn || 'low')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {PIPELINE_ORDER.filter(s => s !== status).slice(0, 3).map(s => (
                            <button
                              key={s}
                              className="text-[8px] px-1 py-0.5 rounded bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleQuickStatusChange(client, s); }}
                            >
                              → {statusConfig[s].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={v => { setIsEditOpen(v); if (!v) { setEditingClient(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update {editingClient?.name}'s details.</DialogDescription>
          </DialogHeader>
          {renderForm(true)}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
