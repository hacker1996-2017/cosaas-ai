import { useState } from 'react';
import { ChevronDown, ChevronUp, Activity, Zap, BookOpen, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Terminal, Brain, Shield, ArrowRightLeft, Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';
import { useAgentInstructions } from '@/hooks/useAgentInstructions';
import { useAgentPerformance, useAgentFollowUps, useAgentDelegations } from '@/hooks/useAgentIntelligence';
import { DevOpsAgentView } from './DevOpsAgentView';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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

// ─── Follow-ups Sub-panel ──────────────────────────────────────────────────
function FollowUpsPanel({ agentId }: { agentId: string }) {
  const { followUps, isLoading, completeFollowUp, isCompleting, stats } = useAgentFollowUps(agentId);

  if (isLoading) return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;

  const pending = followUps.filter(f => f.status === 'pending');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="font-mono">{stats.pending} pending</span>
        {stats.overdue > 0 && <Badge variant="destructive" className="text-[9px] h-4">{stats.overdue} overdue</Badge>}
        <span className="font-mono">{stats.completed} done</span>
      </div>

      {pending.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-2 opacity-60">No pending follow-ups</p>
      ) : (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {pending.slice(0, 8).map(f => {
            const isOverdue = new Date(f.due_at) < new Date();
            return (
              <div key={f.id} className={cn('p-2 rounded-lg border border-border/30 bg-secondary/20', isOverdue && 'border-destructive/40')}>
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1">
                        {f.follow_up_type}
                      </Badge>
                      <Badge variant={f.priority === 'critical' ? 'destructive' : 'secondary'} className="text-[8px] h-3.5 px-1">
                        {f.priority}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-foreground/80 break-words leading-relaxed">{f.description}</p>
                    <p className={cn('text-[9px] mt-0.5', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                      Due {formatDistanceToNow(new Date(f.due_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 shrink-0"
                    disabled={isCompleting}
                    onClick={() => {
                      completeFollowUp({ followUpId: f.id }).then(() => toast.success('Follow-up completed'));
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-exec-success" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Delegations Sub-panel ─────────────────────────────────────────────────
function DelegationsPanel({ agentId, agents }: { agentId: string; agents?: Array<{ id: string; name: string; emoji: string }> }) {
  const { delegations, isLoading, stats } = useAgentDelegations(agentId);

  if (isLoading) return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;

  if (delegations.length === 0) {
    return <p className="text-[10px] text-muted-foreground text-center py-2 opacity-60">No delegations yet</p>;
  }

  const getAgentName = (id: string) => agents?.find(a => a.id === id)?.name || 'Unknown';
  const getAgentEmoji = (id: string) => agents?.find(a => a.id === id)?.emoji || '🤖';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="font-mono">{stats.pending} pending</span>
        <span className="font-mono">{stats.inProgress} active</span>
        <span className="font-mono">{stats.completed} done</span>
      </div>
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {delegations.slice(0, 8).map(d => {
          const isOutbound = d.from_agent_id === agentId;
          return (
            <div key={d.id} className="p-2 rounded-lg border border-border/30 bg-secondary/20">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowRightLeft className="w-3 h-3 text-primary opacity-70" />
                <span className="text-[9px] text-muted-foreground">
                  {isOutbound ? 'Delegated to' : 'Received from'}{' '}
                  <span className="text-foreground font-medium">
                    {getAgentEmoji(isOutbound ? d.to_agent_id : d.from_agent_id)}{' '}
                    {getAgentName(isOutbound ? d.to_agent_id : d.from_agent_id)}
                  </span>
                </span>
                <Badge variant="outline" className="text-[8px] h-3.5 px-1 ml-auto">{d.delegation_type}</Badge>
              </div>
              <p className="text-[10px] text-foreground/80 break-words">{d.task_description}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant={d.status === 'completed' ? 'default' : d.status === 'failed' ? 'destructive' : 'secondary'} className="text-[8px] h-3.5">
                  {d.status}
                </Badge>
                <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Performance Stats Sub-panel ───────────────────────────────────────────
function PerformancePanel({ agentId }: { agentId: string }) {
  const { data: stats, isLoading } = useAgentPerformance(agentId);

  if (isLoading) return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;
  if (!stats) return <p className="text-[10px] text-muted-foreground text-center py-2">No data yet</p>;

  return (
    <div className="space-y-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="stat-card">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Success Rate</p>
          <p className={cn('text-sm font-bold font-mono', stats.successRate >= 80 ? 'text-exec-success' : stats.successRate >= 50 ? 'text-exec-warning' : 'text-destructive')}>
            {stats.successRate}%
          </p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> Executions</p>
          <p className="text-sm font-bold font-mono text-foreground">{stats.totalExecutions}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Avg Duration</p>
          <p className="text-sm font-bold font-mono text-foreground">{stats.avgDurationMs > 1000 ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : `${stats.avgDurationMs}ms`}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" /> Delegations</p>
          <p className="text-sm font-bold font-mono text-foreground">{stats.totalDelegationsInitiated + stats.totalDelegationsReceived}</p>
        </div>
      </div>

      {/* Recent Lessons */}
      {stats.recentLessons.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
            <Brain className="w-3 h-3" /> Learned Lessons
          </h4>
          <div className="space-y-1">
            {stats.recentLessons.slice(0, 5).map((l, i) => (
              <div key={i} className="flex items-start gap-1.5 p-1.5 rounded bg-secondary/20 border border-border/20">
                <span className={cn('text-[9px] mt-0.5', l.outcome === 'success' ? '🟢' : l.outcome === 'failure' ? '🔴' : '🟡')}>
                  {l.outcome === 'success' ? '✓' : l.outcome === 'failure' ? '✗' : '~'}
                </span>
                <p className="text-[10px] text-foreground/80 break-words leading-relaxed flex-1">{l.lesson}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main AgentCard ────────────────────────────────────────────────────────
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
  const isTechOps = isTechOpsAgent(agent);

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

      {/* Expand Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
        className="w-full mt-2.5 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? (
          <><ChevronUp className="w-3 h-3" /><span>Collapse</span></>
        ) : (
          <><ChevronDown className="w-3 h-3" /><span>Details</span></>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          {/* TechOps Agent: show DevOps tools */}
          {isTechOps && <DevOpsAgentView />}

          {/* Intelligence Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full h-7 bg-secondary/30 p-0.5">
              <TabsTrigger value="overview" className="text-[9px] h-6 flex-1 data-[state=active]:bg-background">Overview</TabsTrigger>
              <TabsTrigger value="intelligence" className="text-[9px] h-6 flex-1 data-[state=active]:bg-background">
                <Brain className="w-3 h-3 mr-0.5" />Intel
              </TabsTrigger>
              <TabsTrigger value="follow-ups" className="text-[9px] h-6 flex-1 data-[state=active]:bg-background">
                <Clock className="w-3 h-3 mr-0.5" />Tasks
              </TabsTrigger>
              <TabsTrigger value="delegations" className="text-[9px] h-6 flex-1 data-[state=active]:bg-background">
                <ArrowRightLeft className="w-3 h-3 mr-0.5" />Coord
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-2 space-y-3">
              {/* Role Description */}
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Specialization</h4>
                <p className="text-[11px] text-foreground/80 break-words leading-relaxed">{agent.role}</p>
              </div>

              {agent.description && (
                <div>
                  <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</h4>
                  <p className="text-[11px] text-foreground/80 break-words leading-relaxed">{agent.description}</p>
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="stat-card">
                  <p className="text-[10px] text-muted-foreground">Capacity</p>
                  <p className="text-sm font-semibold text-foreground font-mono">{activeTasks}/{maxCapacity}</p>
                </div>
                <div className="stat-card">
                  <p className="text-[10px] text-muted-foreground">Quota</p>
                  <p className="text-sm font-semibold text-foreground font-mono">{quotaUsed}/{quotaMax}</p>
                </div>
              </div>

              {agent.is_system_agent && (
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                    System Agent
                  </span>
                </div>
              )}

              {/* Instructions */}
              <div className="border-t border-border/30 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Instructions</span>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0">
                        <Plus className="w-3 h-3" />
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
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  </div>
                ) : instructions.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-2 opacity-60">No instructions yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {instructions.map((inst) => (
                      <div
                        key={inst.id}
                        className={cn(
                          'p-2 rounded-lg space-y-1 border border-border/30',
                          inst.is_active ? 'bg-secondary/30' : 'opacity-40 bg-secondary/10'
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-[11px] text-foreground/80 break-words min-w-0 flex-1 leading-relaxed">{inst.instructions}</p>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => handleToggle(inst.id, inst.is_active ?? true)} className="p-0.5 hover:bg-secondary rounded">
                              {inst.is_active ? <ToggleRight className="w-3.5 h-3.5 text-exec-success" /> : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" />}
                            </button>
                            <button onClick={() => handleDeleteInstruction(inst.id)} className="p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {inst.deliverables && inst.deliverables.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {inst.deliverables.map((d, i) => (
                              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/15">{d}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="intelligence" className="mt-2">
              <PerformancePanel agentId={agent.id} />
            </TabsContent>

            <TabsContent value="follow-ups" className="mt-2">
              <FollowUpsPanel agentId={agent.id} />
            </TabsContent>

            <TabsContent value="delegations" className="mt-2">
              <DelegationsPanel agentId={agent.id} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
