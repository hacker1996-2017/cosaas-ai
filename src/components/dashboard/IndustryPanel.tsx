import { Building2, Users, Globe, TrendingUp, Loader2 } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useClients } from '@/hooks/useClients';
import { InsuranceDashboard } from './InsuranceDashboard';
import { cn } from '@/lib/utils';

interface IndustryPanelProps {
  className?: string;
}

export function IndustryPanel({ className }: IndustryPanelProps) {
  const { organization, isLoading: orgLoading } = useOrganization();
  const { totalClients, totalMRR, isLoading: clientsLoading } = useClients();

  const isLoading = orgLoading || clientsLoading;
  const industry = organization?.industry?.toLowerCase() || '';

  // If the org's industry is insurance, show the specialized Insurance dashboard
  if (!isLoading && industry === 'insurance') {
    return <InsuranceDashboard className={className} />;
  }

  if (isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Industry Overview</div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const estimatedRevenue = totalMRR * 12;

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        <span>{organization?.industry ? `${organization.industry} Overview` : 'Business Overview'}</span>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Organization Info */}
        {organization && (
          <div className="p-3 rounded-lg bg-secondary/50">
            <h3 className="text-sm font-semibold text-foreground break-words">{organization.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 break-words">
              {organization.industry || 'General'} • {organization.market || 'All Markets'}
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Market</p>
              <p className="text-sm font-medium text-foreground break-words">
                {organization?.market || 'Not set'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--accent-success))]/10 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[hsl(var(--accent-success))]" />
            </div>
            <div className="min-w-0">
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
            <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary break-words">
              {organization.industry}
            </span>
          </div>
        )}

        {/* Revenue */}
        {totalMRR > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary">
            <TrendingUp className="w-4 h-4 text-[hsl(var(--accent-success))] shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
              <p className="text-sm font-medium text-foreground break-words">
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
            <p className="text-xs text-muted-foreground break-words">
              No clients yet. Add clients via the CRM panel or use commands.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
