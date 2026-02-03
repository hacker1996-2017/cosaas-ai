import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Agent, AgentStatus } from '@/types/executive';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onClick?: () => void;
}

const statusConfig: Record<AgentStatus, { label: string; class: string }> = {
  available: { label: 'Available', class: 'status-dot available' },
  busy: { label: 'Busy', class: 'status-dot busy' },
  error: { label: 'Error', class: 'status-dot error' },
};

export function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const quotaPercent = Math.round((agent.quotaUsed / agent.quotaMax) * 100);

  return (
    <div
      className={cn(
        'agent-card',
        isSelected && 'active'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agent.emoji}</span>
          <span className="font-medium text-sm text-foreground">{agent.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={statusConfig[agent.status].class} />
          <span className="text-xs text-muted-foreground capitalize">
            {statusConfig[agent.status].label}
          </span>
        </div>
      </div>

      {/* Role */}
      <p className="text-xs text-muted-foreground mb-3">{agent.role}</p>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>Active: {agent.activeClients}/{agent.maxCapacity}</span>
        <span>Quota: {quotaPercent}%</span>
      </div>

      {/* Quota Bar */}
      <Progress 
        value={quotaPercent} 
        className="h-1.5 bg-secondary"
      />

      {/* Expand Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="w-full mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            <span>Hide Details</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            <span>View Details</span>
          </>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in">
          {/* Instructions */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Instructions from CoS</h4>
            <p className="text-xs text-muted-foreground">{agent.instructions}</p>
          </div>

          {/* Deliverables */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Deliverables</h4>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {agent.deliverables.map((d, i) => (
                <li key={i}>• {d}</li>
              ))}
            </ul>
          </div>

          {/* Task Memory */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Task Memory</h4>
            <div className="space-y-1">
              {agent.taskMemory.map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    task.status === 'completed' && 'bg-exec-success',
                    task.status === 'ongoing' && 'bg-exec-warning',
                    task.status === 'pending' && 'bg-muted-foreground'
                  )} />
                  <span className="text-muted-foreground">{task.task}</span>
                  <span className="text-muted-foreground/50 capitalize">({task.status})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Audit Log (Real-time)</h4>
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {agent.auditLog.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground/50 shrink-0">
                      {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}:
                    </span>
                    <span className={cn(
                      entry.status === 'success' && 'text-exec-success',
                      entry.status === 'warning' && 'text-exec-warning',
                      entry.status === 'error' && 'text-exec-danger'
                    )}>
                      {entry.action}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
