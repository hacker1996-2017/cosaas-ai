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

  if (!isLoading && industry === 'insurance') {
    return <InsuranceDashboard className={className} />;
  }

  if (isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Industry Overview</div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const estimatedRevenue = totalMRR * 12;

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center gap-2">
        <Building2 className="w-3.5 h-3.5 text-primary" />
        <span>{organization?.industry ? `${organization.industry} Overview` : 'Business Overview'}</span>
      </div>
      
      <div className="p-3 space-y-3">
        {/* Org Info */}
        {organization && (
          <div className="stat-card">
            <h3 className="text-[13px] font-semibold text-foreground break-words leading-tight">{organization.name}</h3>
            <p className="text-[10px] text-muted-foreground mt-1 break-words">
              {organization.industry || 'General'} · {organization.market || 'All Markets'}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="stat-card flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10">
              <Globe className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Market</p>
              <p className="text-[12px] font-semibold text-foreground break-words">
                {organization?.market || 'Not set'}
              </p>
            </div>
          </div>

          <div className="stat-card flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-exec-success/10 flex items-center justify-center shrink-0 border border-exec-success/10">
              <Users className="w-3.5 h-3.5 text-exec-success" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Clients</p>
              <p className="text-[12px] font-semibold text-foreground font-mono">
                {totalClients.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Industry Badge */}
        {organization?.industry && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Industry:</span>
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-primary/10 text-primary border border-primary/15 font-medium break-words">
              {organization.industry}
            </span>
          </div>
        )}

        {/* Revenue */}
        {totalMRR > 0 && (
          <div className="stat-card flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-exec-success shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Monthly Recurring Revenue</p>
              <p className="text-[13px] font-bold text-foreground break-words font-mono">
                ${totalMRR.toLocaleString()}
                <span className="text-[10px] text-muted-foreground font-normal ml-1">
                  /mo (~${(estimatedRevenue / 1000).toFixed(0)}k/yr)
                </span>
              </p>
            </div>
          </div>
        )}

        {totalMRR === 0 && totalClients === 0 && (
          <div className="text-center py-4">
            <p className="text-[11px] text-muted-foreground break-words opacity-60">
              No clients yet. Add clients via CRM or commands.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
