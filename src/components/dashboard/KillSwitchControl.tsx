import { useState } from 'react';
import { AlertTriangle, Loader2, Power } from 'lucide-react';
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
      'panel border',
      killSwitchActive ? 'border-destructive/50 bg-destructive/5' : 'border-border',
      className
    )}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Power className={cn('w-4 h-4', killSwitchActive ? 'text-destructive' : 'text-muted-foreground')} />
          <span>Kill Switch</span>
        </div>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded',
          killSwitchActive ? 'badge-danger' : 'badge-success'
        )}>
          {killSwitchActive ? 'ACTIVE' : 'Normal'}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {killSwitchActive && (
          <div className="flex items-center gap-2 text-xs bg-destructive/10 text-destructive rounded-lg p-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>All AI actions are halted. No automated operations will execute.</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {killSwitchActive
            ? 'Deactivate to resume normal AI operations.'
            : 'Emergency control to halt all AI-driven actions immediately.'}
        </p>

        <Button
          variant={killSwitchActive ? 'default' : 'destructive'}
          size="sm"
          className="w-full"
          onClick={toggleKillSwitch}
          disabled={isToggling}
        >
          {isToggling ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : killSwitchActive ? (
            'Resume Operations'
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 mr-2" />
              Activate Kill Switch
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
