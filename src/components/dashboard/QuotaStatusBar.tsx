import { useMemo } from 'react';
import { Gauge, Shield, Zap, AlertTriangle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';

export function QuotaStatusBar({ className }: { className?: string }) {
  const { organization } = useOrganization();

  const quotaData = useMemo(() => {
    if (!organization) return null;

    const used = organization.actions_this_hour || 0;
    const max = organization.max_actions_per_hour || 100;
    const concurrent = organization.max_concurrent_actions || 10;
    const usagePercent = max > 0 ? Math.round((used / max) * 100) : 0;
    const killSwitch = organization.kill_switch_active;
    const autonomy = organization.autonomy_level || 'draft_actions';

    let status: 'healthy' | 'warning' | 'critical' | 'killed';
    if (killSwitch) status = 'killed';
    else if (usagePercent >= 90) status = 'critical';
    else if (usagePercent >= 70) status = 'warning';
    else status = 'healthy';

    const resetAt = organization.hour_reset_at
      ? new Date(organization.hour_reset_at)
      : null;
    const minutesUntilReset = resetAt
      ? Math.max(0, Math.round((resetAt.getTime() - Date.now()) / 60000))
      : null;

    return { used, max, concurrent, usagePercent, killSwitch, autonomy, status, minutesUntilReset };
  }, [organization]);

  if (!quotaData) return null;

  const statusConfig = {
    healthy: { color: 'text-[hsl(var(--accent-success))]', bg: 'bg-[hsl(var(--accent-success))]/10', border: 'border-[hsl(var(--accent-success))]/20', label: 'Healthy' },
    warning: { color: 'text-[hsl(var(--accent-warning))]', bg: 'bg-[hsl(var(--accent-warning))]/10', border: 'border-[hsl(var(--accent-warning))]/20', label: 'Warning' },
    critical: { color: 'text-[hsl(var(--accent-danger))]', bg: 'bg-[hsl(var(--accent-danger))]/10', border: 'border-[hsl(var(--accent-danger))]/20', label: 'Critical' },
    killed: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20', label: 'HALTED' },
  };

  const cfg = statusConfig[quotaData.status];

  const autonomyLabels: Record<string, string> = {
    observe_only: 'Observe',
    draft_actions: 'Draft',
    execute_with_approval: 'Approve',
    execute_low_risk: 'Low-Risk Auto',
    execute_autonomous: 'Autonomous',
  };

  return (
    <TooltipProvider>
      <div className={cn(
        'flex items-center gap-3 px-3 py-1.5 rounded-lg border text-[10px]',
        cfg.bg, cfg.border, className
      )}>
        {/* Kill Switch indicator */}
        {quotaData.killSwitch && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 text-destructive font-bold animate-pulse">
                <Shield className="w-3 h-3" />
                KILL SWITCH
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              All AI operations are halted. Disable in Settings → Governance.
            </TooltipContent>
          </Tooltip>
        )}

        {/* Quota usage */}
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1.5">
              <Zap className={cn('w-3 h-3', cfg.color)} />
              <span className="font-mono font-semibold text-foreground">{quotaData.used}</span>
              <span className="text-muted-foreground">/ {quotaData.max}</span>
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', {
                    'bg-[hsl(var(--accent-success))]': quotaData.status === 'healthy',
                    'bg-[hsl(var(--accent-warning))]': quotaData.status === 'warning',
                    'bg-[hsl(var(--accent-danger))]': quotaData.status === 'critical',
                    'bg-destructive': quotaData.status === 'killed',
                  })}
                  style={{ width: `${Math.min(quotaData.usagePercent, 100)}%` }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p><strong>{quotaData.used}</strong> of <strong>{quotaData.max}</strong> actions used this hour</p>
            <p className="text-muted-foreground">Max concurrent: {quotaData.concurrent}</p>
            {quotaData.minutesUntilReset !== null && (
              <p className="text-muted-foreground">Resets in ~{quotaData.minutesUntilReset}m</p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Autonomy level */}
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5', cfg.border, cfg.color)}>
              {autonomyLabels[quotaData.autonomy] || quotaData.autonomy}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            AI Autonomy: {quotaData.autonomy.replace(/_/g, ' ')}
          </TooltipContent>
        </Tooltip>

        {/* Reset timer */}
        {quotaData.minutesUntilReset !== null && quotaData.usagePercent >= 50 && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                <span className="font-mono">{quotaData.minutesUntilReset}m</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Quota resets in {quotaData.minutesUntilReset} minutes
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
