import { Building2, Users, Globe, TrendingUp, Loader2 } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useClients } from '@/hooks/useClients';
import { cn } from '@/lib/utils';

interface BusinessContextProps {
  className?: string;
}

export function BusinessContext({ className }: BusinessContextProps) {
  const { organization, isLoading: orgLoading } = useOrganization();
  const { totalClients, totalMRR, isLoading: clientsLoading } = useClients();

  const isLoading = orgLoading || clientsLoading;

  if (isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Business Context</div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Calculate estimated annual revenue from MRR
  const estimatedRevenue = totalMRR * 12;

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <span>Business Context</span>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Organization Info */}
        {organization && (
          <div className="p-3 rounded-lg bg-secondary/50">
            <h3 className="text-sm font-semibold text-foreground">{organization.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {organization.industry || 'General'} • {organization.market || 'All Markets'}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Market</p>
              <p className="text-sm font-medium text-foreground">
                {organization?.market || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-exec-success/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-exec-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clients</p>
              <p className="text-sm font-medium text-foreground">
                {totalClients.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Industry Badge */}
        {organization?.industry && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Industry:</span>
            <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary">
              {organization.industry}
            </span>
          </div>
        )}

        {/* Revenue */}
        {totalMRR > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary">
            <TrendingUp className="w-4 h-4 text-exec-success" />
            <div>
              <p className="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
              <p className="text-sm font-medium text-foreground">
                ${totalMRR.toLocaleString()}/mo
                <span className="text-xs text-muted-foreground ml-1">
                  (~${(estimatedRevenue / 1000).toFixed(0)}k/yr)
                </span>
              </p>
            </div>
          </div>
        )}

        {totalMRR === 0 && totalClients === 0 && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              No clients yet. Add clients via the CRM panel or use commands.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
