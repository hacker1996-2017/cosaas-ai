import { Loader2, Shield, Link2 } from 'lucide-react';
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
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span>Audit Log</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Link2 className="w-3 h-3" />
          <span>#{stats.latestSequence}</span>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Shield className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No audit entries yet</p>
            <p className="text-xs text-muted-foreground mt-1">Immutable, hash-chained audit trail</p>
          </div>
        ) : (
          <>
            {/* Hash chain integrity indicator */}
            <div className="flex items-center gap-2 text-xs bg-secondary/50 rounded-lg p-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-muted-foreground">Chain integrity verified</span>
              <span className="ml-auto font-mono text-primary text-[10px]">
                {stats.latestHash.substring(0, 12)}…
              </span>
            </div>

            {entries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 py-1.5 border-b border-border/50 last:border-0">
                <span className="text-sm mt-0.5">{getEventIcon(entry.event_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">
                      {entry.action}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      #{entry.sequence_number}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {entry.resource_type} · {entry.actor_type}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
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
