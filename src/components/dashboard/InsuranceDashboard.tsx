import { Shield, DollarSign, FileText, AlertTriangle, Loader2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInsurance } from '@/hooks/useInsurance';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface InsuranceDashboardProps {
  className?: string;
}

export function InsuranceDashboard({ className }: InsuranceDashboardProps) {
  const { policies, premiums, commissions, insurers, isLoading, kpis } = useInsurance();

  if (isLoading) {
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

  const commissionCollectionRate = kpis.totalCommissions > 0
    ? Math.round((kpis.receivedCommissions / kpis.totalCommissions) * 100)
    : 0;

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <span>Insurance Operations</span>
      </div>

      <div className="p-3 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-muted-foreground">Policies</span>
            </div>
            <p className="text-lg font-bold text-foreground">{kpis.totalPolicies}</p>
            <p className="text-[10px] text-[hsl(var(--accent-success))]">{kpis.activePolicies} active</p>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3 h-3 text-[hsl(var(--accent-success))]" />
              <span className="text-[10px] text-muted-foreground">Total Premiums</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              ${kpis.totalPremiumValue.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">{kpis.premiumsDue} due</p>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-[hsl(var(--accent-warning))]" />
              <span className="text-[10px] text-muted-foreground">Commissions</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              ${kpis.totalCommissions.toLocaleString()}
            </p>
            <div className="mt-1">
              <Progress value={commissionCollectionRate} className="h-1" />
              <p className="text-[10px] text-muted-foreground mt-0.5">{commissionCollectionRate}% collected</p>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3 h-3 text-destructive" />
              <span className="text-[10px] text-muted-foreground">Overdue</span>
            </div>
            <p className="text-lg font-bold text-foreground">{kpis.premiumsOverdue}</p>
            <p className="text-[10px] text-destructive">
              ${kpis.pendingCommissions.toLocaleString()} pending
            </p>
          </div>
        </div>

        {/* Insurers */}
        {insurers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Insurers ({kpis.totalInsurers})</p>
            <div className="space-y-1">
              {insurers.slice(0, 5).map((insurer) => (
                <div key={insurer.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-xs">
                  <span className="text-foreground">{insurer.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{((insurer.commission_rate_default || 0.1) * 100).toFixed(0)}%</span>
                    <span className={cn(
                      'w-2 h-2 rounded-full',
                      insurer.is_active ? 'bg-[hsl(var(--accent-success))]' : 'bg-muted-foreground'
                    )} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Policies */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Recent Policies
          </p>
          <ScrollArea className="h-32">
            {policies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Shield className="w-6 h-6 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">No policies yet</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {policies.slice(0, 10).map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-xs">
                    <div className="min-w-0">
                      <p className="text-foreground font-medium truncate">{policy.policy_number}</p>
                      <p className="text-[10px] text-muted-foreground">{policy.policy_type}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-foreground">${Number(policy.premium_amount).toLocaleString()}</p>
                      <span className={cn(
                        'text-[10px] px-1 py-0.5 rounded capitalize',
                        policy.status === 'active' ? 'badge-success' :
                        policy.status === 'draft' ? 'bg-secondary text-muted-foreground' :
                        'badge-warning'
                      )}>
                        {policy.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
