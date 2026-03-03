import { useState } from 'react';
import { 
  Search, TrendingUp, TrendingDown, BarChart3, Edit2, 
  Loader2, UserPlus, Mail, Phone, Building, Eye 
} from 'lucide-react';
import { ClientDetailView } from './ClientDetailView';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/useClients';
import { Database } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientStatus = Database['public']['Enums']['client_status'];
type ClientType = Database['public']['Enums']['client_type'];
type RiskLevel = Database['public']['Enums']['risk_level'];

const riskBadgeClass: Record<RiskLevel, string> = {
  low: 'badge-success',
  medium: 'badge-warning',
  high: 'badge-danger',
  critical: 'badge-danger',
};

const statusColors: Record<ClientStatus, string> = {
  prospect: 'bg-blue-500/20 text-blue-400',
  onboarding: 'bg-yellow-500/20 text-yellow-400',
  active: 'bg-green-500/20 text-green-400',
  paused: 'bg-gray-500/20 text-gray-400',
  churned: 'bg-red-500/20 text-red-400',
};

interface InternalCRMProps {
  className?: string;
}

export function InternalCRM({ className }: InternalCRMProps) {
  const { clients, isLoading, createClient, isCreating } = useClients();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // New client form state
  const [newClient, setNewClient] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    client_type: 'smb' as ClientType,
    status: 'prospect' as ClientStatus,
    mrr: 0,
  });

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateClient = async () => {
    if (!newClient.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    try {
      await createClient({
        name: newClient.name.trim(),
        company: newClient.company.trim() || null,
        email: newClient.email.trim() || null,
        phone: newClient.phone.trim() || null,
        client_type: newClient.client_type,
        status: newClient.status,
        mrr: newClient.mrr,
      });
      toast.success('Client created successfully');
      setIsDialogOpen(false);
      setNewClient({
        name: '',
        company: '',
        email: '',
        phone: '',
        client_type: 'smb',
        status: 'prospect',
        mrr: 0,
      });
    } catch (error) {
      console.error('Failed to create client:', error);
      toast.error('Failed to create client');
    }
  };

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

  // Detail view mode
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

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <span>Internal CRM</span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <UserPlus className="w-3 h-3 mr-1" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client record in your CRM.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={newClient.company}
                  onChange={(e) => setNewClient({ ...newClient, company: e.target.value })}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="john@acme.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    placeholder="+1 555 123 4567"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Client Type</Label>
                  <Select
                    value={newClient.client_type}
                    onValueChange={(v) => setNewClient({ ...newClient, client_type: v as ClientType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="smb">SMB</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={newClient.status}
                    onValueChange={(v) => setNewClient({ ...newClient, status: v as ClientStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mrr">Monthly Revenue ($)</Label>
                <Input
                  id="mrr"
                  type="number"
                  value={newClient.mrr}
                  onChange={(e) => setNewClient({ ...newClient, mrr: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateClient} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Client'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="pl-9 bg-secondary border-0"
          />
        </div>

        {/* Client List */}
        <ScrollArea className="h-72">
          <div className="space-y-2">
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserPlus className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {clients.length === 0 && 'Click "Add Client" to create your first client'}
                </p>
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className={cn(
                    'p-3 rounded-lg bg-secondary/50 cursor-pointer transition-all hover:bg-secondary',
                    selectedClient?.id === client.id && 'ring-1 ring-primary'
                  )}
                  onClick={() => setSelectedClient(client.id === selectedClient?.id ? null : client)}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-medium text-foreground truncate">{client.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {client.company || 'No company'} • {client.client_type}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-medium text-foreground">
                        ${(Number(client.mrr) || 0).toLocaleString()}
                        <span className="text-xs text-muted-foreground">/mo</span>
                      </p>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        riskBadgeClass[client.risk_of_churn || 'low']
                      )}>
                        {client.risk_of_churn === 'low' ? 'Low Risk' : 
                         client.risk_of_churn === 'medium' ? 'Med Risk' : 'High Risk'}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={cn(
                    'text-xs px-1.5 py-0.5 rounded capitalize',
                    statusColors[client.status || 'prospect']
                  )}>
                    {client.status || 'prospect'}
                  </span>

                  {/* Expanded Details */}
                  {selectedClient?.id === client.id && (
                    <div className="pt-3 mt-3 border-t border-border space-y-3 animate-fade-in">
                      {/* Contact Info */}
                      <div className="space-y-1">
                        {client.email && (
                          <div className="flex items-center gap-2 text-xs">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="text-primary">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2 text-xs">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span className="text-foreground">{client.phone}</span>
                          </div>
                        )}
                        {client.industry && (
                          <div className="flex items-center gap-2 text-xs">
                            <Building className="w-3 h-3 text-muted-foreground" />
                            <span className="text-foreground">{client.industry}</span>
                          </div>
                        )}
                      </div>

                      {/* AI Analytics */}
                      <div className="p-2 rounded bg-card">
                        <p className="text-xs text-muted-foreground mb-1">AI Analytics</p>
                        <div className="flex items-center gap-2">
                          {client.expansion_opportunity === 'high' ? (
                            <TrendingUp className="w-4 h-4 text-exec-success" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-exec-warning" />
                          )}
                          <span className="text-xs text-foreground">
                            {client.expansion_opportunity === 'high'
                              ? 'High upsell potential'
                              : client.expansion_opportunity === 'medium'
                              ? 'Moderate growth potential'
                              : 'Stable engagement'}
                          </span>
                        </div>
                      </div>

                      {/* Lifetime Value */}
                      {client.lifetime_value && Number(client.lifetime_value) > 0 && (
                        <div className="text-xs">
                          <span className="text-muted-foreground">Lifetime Value: </span>
                          <span className="text-primary font-medium">
                            ${Number(client.lifetime_value).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button 
                          size="sm" variant="outline" className="h-7 text-xs flex-1"
                          onClick={(e) => { e.stopPropagation(); setDetailClient(client); }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Full Profile
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
