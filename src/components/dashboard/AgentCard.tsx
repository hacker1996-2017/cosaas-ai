import { useState } from 'react';
import { Activity, Zap, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Database } from '@/integrations/supabase/types';
import { AgentDetailModal } from './AgentDetailModal';

type Agent = Database['public']['Tables']['agents']['Row'];
type AgentStatus = Database['public']['Enums']['agent_status'];

interface AgentCardProps {
  agent: Agent;
  isSelected?: boolean;
  onClick?: () => void;
}

const statusConfig: Record<AgentStatus, { label: string; class: string }> = {
  available: { label: 'Online', class: 'status-dot available' },
  busy: { label: 'Busy', class: 'status-dot busy' },
  error: { label: 'Error', class: 'status-dot error' },
  maintenance: { label: 'Maint.', class: 'status-dot busy' },
};

const TECHOPS_ROLES = ['devops', 'techops', 'tech ops', 'dev ops', 'infrastructure', 'sre', 'platform'];

function isTechOpsAgent(agent: Agent): boolean {
  const roleLower = agent.role?.toLowerCase() || '';
  const nameLower = agent.name?.toLowerCase() || '';
  return TECHOPS_ROLES.some(r => roleLower.includes(r) || nameLower.includes(r));
}

export function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const quotaMax = agent.quota_max || 1500;
  const quotaUsed = agent.quota_used || 0;
  const quotaPercent = Math.round((quotaUsed / quotaMax) * 100);
  const activeTasks = agent.active_tasks || 0;
  const maxCapacity = agent.max_capacity || 5;
  const status = agent.status || 'available';
  const isTechOps = isTechOpsAgent(agent);

  return (
    <>
      <div
        className={cn('agent-card', isSelected && 'active')}
        onClick={(e) => {
          e.stopPropagation();
          setModalOpen(true);
          onClick?.();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">{agent.emoji}</span>
            <span className="font-semibold text-[13px] text-foreground break-words leading-tight">{agent.name}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isTechOps && <Terminal className="w-3 h-3 text-primary opacity-70" />}
            <div className={statusConfig[status].class} />
            <span className="text-[10px] text-muted-foreground font-medium">
              {statusConfig[status].label}
            </span>
          </div>
        </div>

        {/* Role */}
        <p className="text-[11px] text-muted-foreground mb-3 break-words line-clamp-2 leading-relaxed">{agent.role}</p>

        {/* Stats */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 opacity-60" />
            <span className="font-mono">{activeTasks}/{maxCapacity}</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 opacity-60" />
            <span className="font-mono">{quotaPercent}%</span>
          </div>
        </div>

        {/* Quota Bar */}
        <Progress
          value={quotaPercent}
          className={cn(
            "h-1 bg-secondary/50",
            quotaPercent > 80 && "[&>div]:bg-exec-warning",
            quotaPercent > 95 && "[&>div]:bg-destructive"
          )}
        />

        {/* Click hint */}
        <p className="text-[9px] text-muted-foreground text-center mt-2 opacity-50">Click to expand</p>
      </div>

      <AgentDetailModal agent={agent} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
