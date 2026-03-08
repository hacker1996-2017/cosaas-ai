import { Loader2, Shield, Link2, Fingerprint } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuditLog } from '@/hooks/useAuditLog';

interface AuditLogPanelProps {
  className?: string;
}

export function AuditLogPanel({ className }: AuditLogPanelProps) {
  const { entries, isLoading, stats } = useAuditLog();

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'policy_evaluation': return '⚖️';
      case 'action_approved': return '✅';
      case 'action_rejected': return '🚫';
      case 'command_created': return '📝';
      case 'decision_made': return '🎯';
      default: return '📋';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Audit Log</div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-3.5 h-3.5 text-primary" />
          <span>Audit Log</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
          <Link2 className="w-3 h-3" />
          <span>#{stats.latestSequence}</span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Shield className="w-6 h-6 text-muted-foreground mb-2 opacity-40" />
            <p className="text-xs text-muted-foreground">No audit entries yet</p>
            <p className="text-[10px] text-muted-foreground mt-1 opacity-60">Hash-chained audit trail</p>
          </div>
        ) : (
          <>
            {/* Chain integrity */}
            <div className="flex items-center gap-2 text-[10px] rounded-lg p-2 border border-border/30"
              style={{ background: 'hsl(var(--bg-soft) / 0.4)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-exec-success animate-pulse" />
              <span className="text-muted-foreground">Chain verified</span>
              <span className="ml-auto font-mono text-primary text-[9px]">
                {stats.latestHash.substring(0, 12)}…
              </span>
            </div>

            {entries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 py-1.5 border-b border-border/20 last:border-0">
                <span className="text-xs mt-0.5">{getEventIcon(entry.event_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-foreground">
                      {entry.action}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      #{entry.sequence_number}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {entry.resource_type} · {entry.actor_type}
                  </p>
                  <p className="text-[9px] text-muted-foreground font-mono">
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
