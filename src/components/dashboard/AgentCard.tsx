import { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Zap, BookOpen, Plus, Trash2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Database } from '@/integrations/supabase/types';
import { useAgentInstructions } from '@/hooks/useAgentInstructions';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInstruction, setNewInstruction] = useState({ instructions: '', priority: 0, deliverables: '' });
  
  const { instructions, isLoading: instructionsLoading, createInstruction, updateInstruction, deleteInstruction, isCreating } = useAgentInstructions(agent.id);
  
  const quotaMax = agent.quota_max || 1500;
  const quotaUsed = agent.quota_used || 0;
  const quotaPercent = Math.round((quotaUsed / quotaMax) * 100);
  
  const activeTasks = agent.active_tasks || 0;
  const maxCapacity = agent.max_capacity || 5;
  const status = agent.status || 'available';

  const handleCreate = async () => {
    if (!newInstruction.instructions.trim()) {
      toast.error('Instructions are required');
      return;
    }
    try {
      await createInstruction({
        agent_id: agent.id,
        instructions: newInstruction.instructions.trim(),
        priority: newInstruction.priority,
        deliverables: newInstruction.deliverables ? newInstruction.deliverables.split(',').map(d => d.trim()).filter(Boolean) : [],
      });
      toast.success('Instruction created');
      setIsDialogOpen(false);
      setNewInstruction({ instructions: '', priority: 0, deliverables: '' });
    } catch {
      toast.error('Failed to create instruction');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await updateInstruction({ id, updates: { is_active: !isActive } });
    } catch {
      toast.error('Failed to update instruction');
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    try {
      await deleteInstruction(id);
      toast.success('Instruction deleted');
    } catch {
      toast.error('Failed to delete instruction');
    }
  };

  return (
    <div
      className={cn('agent-card', isSelected && 'active')}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{agent.emoji}</span>
          <span className="font-medium text-sm text-foreground break-words">{agent.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={statusConfig[status].class} />
          <span className="text-xs text-muted-foreground capitalize">
            {statusConfig[status].label}
          </span>
        </div>
      </div>

      {/* Role */}
      <p className="text-xs text-muted-foreground mb-3 break-words line-clamp-2">{agent.role}</p>

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
          quotaPercent > 80 && "[&>div]:bg-[hsl(var(--accent-warning))]",
          quotaPercent > 95 && "[&>div]:bg-destructive"
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
          <><ChevronUp className="w-3 h-3" /><span>Hide Details</span></>
        ) : (
          <><ChevronDown className="w-3 h-3" /><span>View Details</span></>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {/* Role Description */}
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Specialization</h4>
            <p className="text-xs text-muted-foreground break-words">{agent.role}</p>
          </div>

          {/* Description */}
          {agent.description && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1">Description</h4>
              <p className="text-xs text-muted-foreground break-words">{agent.description}</p>
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
              <span className="text-muted-foreground">Auto-configured</span>
            </div>
          )}

          {/* Agent Instructions - Embedded */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Instructions</span>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>New Instruction for {agent.emoji} {agent.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Instructions *</Label>
                      <Textarea
                        value={newInstruction.instructions}
                        onChange={(e) => setNewInstruction({ ...newInstruction, instructions: e.target.value })}
                        placeholder="Describe what this agent should do..."
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Priority (0-10)</Label>
                        <Input
                          type="number" min={0} max={10}
                          value={newInstruction.priority}
                          onChange={(e) => setNewInstruction({ ...newInstruction, priority: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Deliverables</Label>
                        <Input
                          value={newInstruction.deliverables}
                          onChange={(e) => setNewInstruction({ ...newInstruction, deliverables: e.target.value })}
                          placeholder="Report, Email"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={isCreating}>
                      {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {instructionsLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : instructions.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-2">No instructions yet</p>
            ) : (
              <div className="space-y-1.5">
                {instructions.map((inst) => (
                  <div
                    key={inst.id}
                    className={cn(
                      'p-2 rounded bg-secondary/50 space-y-1',
                      !inst.is_active && 'opacity-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-[11px] text-foreground break-words min-w-0 flex-1">{inst.instructions}</p>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => handleToggle(inst.id, inst.is_active ?? true)} className="p-0.5 hover:bg-secondary rounded">
                          {inst.is_active ? <ToggleRight className="w-3.5 h-3.5 text-[hsl(var(--accent-success))]" /> : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                        <button onClick={() => handleDeleteInstruction(inst.id)} className="p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {inst.deliverables && inst.deliverables.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {inst.deliverables.map((d, i) => (
                          <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-primary/20 text-primary">{d}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
