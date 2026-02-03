import { useState } from 'react';
import { Search, TrendingUp, TrendingDown, BarChart3, Edit2 } from 'lucide-react';
import { Client } from '@/types/executive';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Mock clients
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Acme Corp',
    type: 'enterprise',
    industry: 'Insurance',
    status: 'active',
    mrr: 5000,
    riskOfChurn: 'low',
    expansionOpportunity: 'high',
    primaryContact: { name: 'John Smith', email: 'john@acme.com' },
    memorySummary: 'Long-term enterprise client. Recently expressed interest in premium tier.',
    integrations: [
      { name: 'HubSpot', status: 'connected', syncErrors: 0 },
      { name: 'Stripe', status: 'connected', syncErrors: 0 },
    ],
  },
  {
    id: '2',
    name: 'TechStart Inc',
    type: 'startup',
    industry: 'Tech',
    status: 'active',
    mrr: 299,
    riskOfChurn: 'medium',
    expansionOpportunity: 'medium',
    primaryContact: { name: 'Sarah Lee', email: 'sarah@techstart.io' },
    memorySummary: 'Fast-growing startup. May need to upgrade soon due to growth.',
    integrations: [
      { name: 'Slack', status: 'connected', syncErrors: 1 },
    ],
  },
  {
    id: '3',
    name: 'Global Finance LLC',
    type: 'enterprise',
    industry: 'Finance',
    status: 'active',
    mrr: 12000,
    riskOfChurn: 'low',
    expansionOpportunity: 'low',
    primaryContact: { name: 'Michael Brown', email: 'mbrown@globalfin.com' },
    memorySummary: 'Key enterprise account. Prefers conservative approach to changes.',
    integrations: [
      { name: 'QuickBooks', status: 'connected', syncErrors: 0 },
      { name: 'HubSpot', status: 'connected', syncErrors: 0 },
    ],
  },
];

const riskBadgeClass = {
  low: 'badge-success',
  medium: 'badge-warning',
  high: 'badge-danger',
};

interface InternalCRMProps {
  className?: string;
}

export function InternalCRM({ className }: InternalCRMProps) {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const filteredClients = mockClients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <span>Internal CRM</span>
        <Button size="sm" variant="outline" className="h-7 text-xs">
          + Add Client
        </Button>
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
            {filteredClients.map((client) => (
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
                  <div>
                    <h4 className="text-sm font-medium text-foreground">{client.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {client.industry} • {client.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      ${client.mrr.toLocaleString()}
                      <span className="text-xs text-muted-foreground">/mo</span>
                    </p>
                    <span className={cn('text-xs px-1.5 py-0.5 rounded', riskBadgeClass[client.riskOfChurn])}>
                      {client.riskOfChurn === 'low' ? 'Low Risk' : client.riskOfChurn === 'medium' ? 'Med Risk' : 'High Risk'}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedClient?.id === client.id && (
                  <div className="pt-3 mt-3 border-t border-border space-y-3 animate-fade-in">
                    {/* AI Analytics */}
                    <div className="p-2 rounded bg-card">
                      <p className="text-xs text-muted-foreground mb-1">AI Analytics</p>
                      <div className="flex items-center gap-2">
                        {client.riskOfChurn === 'low' ? (
                          <TrendingUp className="w-4 h-4 text-exec-success" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-exec-warning" />
                        )}
                        <span className="text-xs text-foreground">
                          {client.expansionOpportunity === 'high'
                            ? 'High upsell potential'
                            : 'Stable engagement'}
                        </span>
                      </div>
                    </div>

                    {/* Memory Summary */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Memory Summary</p>
                      <p className="text-xs text-foreground">{client.memorySummary}</p>
                    </div>

                    {/* Contact */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Primary Contact</p>
                      <p className="text-xs text-foreground">{client.primaryContact.name}</p>
                      <p className="text-xs text-primary">{client.primaryContact.email}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Deep Analyze
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
