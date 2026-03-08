import { useState } from 'react';
import { AlertTriangle, Loader2, Power, ShieldOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KillSwitchControlProps {
  className?: string;
}

export function KillSwitchControl({ className }: KillSwitchControlProps) {
  const { organization, organizationId } = useOrganization();
  const [isToggling, setIsToggling] = useState(false);

  const killSwitchActive = (organization as Record<string, unknown>)?.kill_switch_active === true;

  const toggleKillSwitch = async () => {
    if (!organizationId) return;

    setIsToggling(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ kill_switch_active: !killSwitchActive } as Record<string, unknown>)
        .eq('id', organizationId);

      if (error) throw error;

      if (!killSwitchActive) {
        toast.warning('Kill switch ACTIVATED — all AI actions halted');
      } else {
        toast.success('Kill switch deactivated — operations resumed');
      }
    } catch {
      toast.error('Failed to toggle kill switch');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className={cn(
      'panel',
      killSwitchActive && 'border-destructive/30',
      className
    )}
      style={killSwitchActive ? {
        background: 'linear-gradient(168deg, hsl(0 72% 56% / 0.06) 0%, hsl(var(--bg-panel)) 100%)',
      } : undefined}
    >
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          {killSwitchActive 
            ? <ShieldOff className="w-3.5 h-3.5 text-destructive" />
            : <ShieldCheck className="w-3.5 h-3.5 text-exec-success" />
          }
          <span>Emergency Control</span>
        </div>
        <span className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full',
          killSwitchActive ? 'badge-danger' : 'badge-success'
        )}>
          {killSwitchActive ? 'HALTED' : 'ACTIVE'}
        </span>
      </div>

      <div className="p-3 space-y-3 overflow-hidden">
        {killSwitchActive && (
          <div className="flex items-start gap-2 text-[11px] bg-destructive/8 text-destructive rounded-lg p-2.5 border border-destructive/15">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span className="leading-relaxed break-words min-w-0">All AI-driven operations are halted. No automated actions will execute.</span>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
          {killSwitchActive
            ? 'Deactivate to resume normal AI operations.'
            : 'Immediately halt all AI-driven actions.'}
        </p>

        <Button
          variant={killSwitchActive ? 'default' : 'destructive'}
          size="sm"
          className="w-full h-8 text-xs font-semibold overflow-hidden"
          onClick={toggleKillSwitch}
          disabled={isToggling}
        >
          {isToggling ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : killSwitchActive ? (
            <span className="truncate">Resume Operations</span>
          ) : (
            <span className="flex items-center gap-1.5 truncate">
              <Power className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Activate Kill Switch</span>
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
