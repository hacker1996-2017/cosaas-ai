import { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Database } from '@/integrations/supabase/types';

type Agent = Database['public']['Tables']['agents']['Row'];
type AgentStatus = Database['public']['Enums']['agent_status'];

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onClick?: () => void;
}

const statusConfig: Record<AgentStatus, { label: string; class: string }> = {
  available: { label: 'Available', class: 'status-dot available' },
  busy: { label: 'Busy', class: 'status-dot busy' },
  error: { label: 'Error', class: 'status-dot error' },
  maintenance: { label: 'Maintenance', class: 'status-dot busy' },
};

export function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const quotaMax = agent.quota_max || 1500;
  const quotaUsed = agent.quota_used || 0;
  const quotaPercent = Math.round((quotaUsed / quotaMax) * 100);
  
  const activeTasks = agent.active_tasks || 0;
  const maxCapacity = agent.max_capacity || 5;
  const status = agent.status || 'available';

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
          <div className={statusConfig[status].class} />
          <span className="text-xs text-muted-foreground capitalize">
            {statusConfig[status].label}
          </span>
        </div>
      </div>

      {/* Role */}
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.role}</p>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <div className="flex items-center gap-1">
          <Activity className="w-3 h-3" />
          <span>Tasks: {activeTasks}/{maxCapacity}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          <span>Quota: {quotaPercent}%</span>
        </div>
      </div>

      {/* Quota Bar */}
      <Progress 
        value={quotaPercent} 
        className={cn(
          "h-1.5 bg-secondary",
          quotaPercent > 80 && "[&>div]:bg-exec-warning",
          quotaPercent > 95 && "[&>div]:bg-exec-danger"
        )}
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
          {/* Role Description */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Specialization</h4>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
          </div>

          {/* Description */}
          {agent.description && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1">Description</h4>
              <p className="text-xs text-muted-foreground">{agent.description}</p>
            </div>
          )}

          {/* Agent Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-secondary/50">
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="text-sm font-medium text-foreground">{activeTasks}/{maxCapacity}</p>
            </div>
            <div className="p-2 rounded bg-secondary/50">
              <p className="text-xs text-muted-foreground">Daily Quota</p>
              <p className="text-sm font-medium text-foreground">{quotaUsed}/{quotaMax}</p>
            </div>
          </div>

          {/* System Agent Badge */}
          {agent.is_system_agent && (
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary">
                System Agent
              </span>
              <span className="text-muted-foreground">Auto-configured for your industry</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
