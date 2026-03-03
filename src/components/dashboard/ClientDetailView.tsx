import { useState } from 'react';
import { 
  User, Mail, Phone, Building, TrendingUp, TrendingDown, 
  DollarSign, Shield, MessageSquare, ArrowLeft, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/useClients';
import { useEmails } from '@/hooks/useEmails';
import { useCalls } from '@/hooks/useCalls';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';

type Client = Database['public']['Tables']['clients']['Row'];

interface ClientDetailViewProps {
  client: Client;
  onBack: () => void;
}

export function ClientDetailView({ client, onBack }: ClientDetailViewProps) {
  const { emails, isLoading: emailsLoading } = useEmails(client.id);
  const { calls, isLoading: callsLoading } = useCalls(client.id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack} className="h-8 px-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground truncate">{client.name}</h3>
          <p className="text-xs text-muted-foreground">{client.company || 'No company'} • {client.client_type}</p>
        </div>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded capitalize',
          client.status === 'active' ? 'badge-success' :
          client.status === 'prospect' ? 'badge-info' :
          client.status === 'churned' ? 'badge-danger' : 'badge-warning'
        )}>
          {client.status}
        </span>
      </div>

      {/* Contact Info */}
      <div className="p-3 rounded-lg bg-secondary/50 space-y-2">
        {client.email && (
          <div className="flex items-center gap-2 text-xs">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-primary">{client.email}</span>
          </div>
        )}
        {client.phone && (
          <div className="flex items-center gap-2 text-xs">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{client.phone}</span>
          </div>
        )}
        {client.industry && (
          <div className="flex items-center gap-2 text-xs">
            <Building className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-foreground">{client.industry}</span>
          </div>
        )}
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-lg bg-secondary/50 text-center">
          <DollarSign className="w-3 h-3 mx-auto text-[hsl(var(--accent-success))] mb-1" />
          <p className="text-xs font-bold text-foreground">${Number(client.mrr || 0).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">MRR</p>
        </div>
        <div className="p-2.5 rounded-lg bg-secondary/50 text-center">
          <TrendingUp className="w-3 h-3 mx-auto text-primary mb-1" />
          <p className="text-xs font-bold text-foreground">${Number(client.lifetime_value || 0).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">LTV</p>
        </div>
        <div className="p-2.5 rounded-lg bg-secondary/50 text-center">
          <Shield className="w-3 h-3 mx-auto text-[hsl(var(--accent-warning))] mb-1" />
          <p className="text-xs font-bold text-foreground capitalize">{client.risk_of_churn || 'low'}</p>
          <p className="text-[10px] text-muted-foreground">Churn Risk</p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="p-3 rounded-lg bg-card border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          {client.expansion_opportunity === 'high' ? (
            <TrendingUp className="w-4 h-4 text-[hsl(var(--accent-success))]" />
          ) : (
            <TrendingDown className="w-4 h-4 text-[hsl(var(--accent-warning))]" />
          )}
          <span className="text-xs font-medium text-foreground">AI Assessment</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {client.expansion_opportunity === 'high'
            ? 'High upsell potential — recommend scheduling expansion conversation.'
            : client.expansion_opportunity === 'medium'
            ? 'Moderate growth potential — monitor engagement metrics closely.'
            : 'Stable engagement — maintain current service level.'}
        </p>
      </div>

      {/* Communication History */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
          <MessageSquare className="w-3 h-3" />
          Communication History
        </p>
        <ScrollArea className="h-40">
          {(emailsLoading || callsLoading) ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          ) : emails.length === 0 && calls.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No communication history</p>
          ) : (
            <div className="space-y-1.5">
              {[...emails.map(e => ({ type: 'email' as const, date: e.created_at, data: e })),
                ...calls.map(c => ({ type: 'call' as const, date: c.created_at, data: c }))]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 15)
                .map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-secondary/30 text-xs">
                    {item.type === 'email' ? (
                      <Mail className="w-3 h-3 text-primary shrink-0" />
                    ) : (
                      <Phone className="w-3 h-3 text-[hsl(var(--accent-success))] shrink-0" />
                    )}
                    <span className="text-foreground truncate flex-1">
                      {item.type === 'email' ? (item.data as any).subject : (item.data as any).summary || 'Call'}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {format(new Date(item.date), 'MMM d')}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Tags */}
      {client.tags && client.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {client.tags.map((tag, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
