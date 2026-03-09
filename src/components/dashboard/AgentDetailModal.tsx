import { useState } from 'react';
import {
  Activity, Zap, BookOpen, Plus, Trash2, ToggleLeft, ToggleRight,
  Loader2, Terminal, Brain, Shield, ArrowRightLeft, Clock,
  CheckCircle2, AlertTriangle, TrendingUp, X, Maximize2, Eye,
  BarChart3, FileText, Target, Cpu, Network
} from 'lucide-react';
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
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type Agent = Database['public']['Tables']['agents']['Row'];
type AgentStatus = Database['public']['Enums']['agent_status'];

interface AgentDetailModalProps {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<AgentStatus, { label: string; dotClass: string; badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  available: { label: 'Online', dotClass: 'status-dot available', badgeVariant: 'default' },
  busy: { label: 'Busy', dotClass: 'status-dot busy', badgeVariant: 'secondary' },
  error: { label: 'Error', dotClass: 'status-dot error', badgeVariant: 'destructive' },
  maintenance: { label: 'Maintenance', dotClass: 'status-dot busy', badgeVariant: 'outline' },
};

const TECHOPS_ROLES = ['devops', 'techops', 'tech ops', 'dev ops', 'infrastructure', 'sre', 'platform'];
function isTechOpsAgent(agent: Agent): boolean {
  const roleLower = agent.role?.toLowerCase() || '';
  const nameLower = agent.name?.toLowerCase() || '';
  return TECHOPS_ROLES.some(r => roleLower.includes(r) || nameLower.includes(r));
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subValue, variant = 'default' }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const colorMap = {
    default: 'text-foreground',
    success: 'text-exec-success',
    warning: 'text-exec-warning',
    danger: 'text-destructive',
  };
  return (
    <div className="panel p-4 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-2xl font-bold font-mono', colorMap[variant])}>{value}</p>
      {subValue && <p className="text-[11px] text-muted-foreground">{subValue}</p>}
    </div>
  );
}

// ─── Performance Tab ───────────────────────────────────────────────────────
function PerformanceTab({ agentId }: { agentId: string }) {
  const { data: stats, isLoading } = useAgentPerformance(agentId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!stats) return <p className="text-sm text-muted-foreground text-center py-12">No performance data yet. Agent hasn't executed any actions.</p>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Success Rate"
          value={`${stats.successRate}%`}
          variant={stats.successRate >= 80 ? 'success' : stats.successRate >= 50 ? 'warning' : 'danger'}
          subValue={`${stats.totalExecutions} total executions`}
        />
        <StatCard icon={Activity} label="Total Executions" value={stats.totalExecutions} />
        <StatCard
          icon={Clock}
          label="Avg Duration"
          value={stats.avgDurationMs > 1000 ? `${(stats.avgDurationMs / 1000).toFixed(1)}s` : `${stats.avgDurationMs}ms`}
        />
        <StatCard icon={ArrowRightLeft} label="Delegations" value={stats.totalDelegationsInitiated + stats.totalDelegationsReceived} subValue={`${stats.totalDelegationsInitiated} sent · ${stats.totalDelegationsReceived} received`} />
      </div>

      {/* Follow-up KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={Clock} label="Pending Follow-ups" value={stats.pendingFollowUps} variant={stats.pendingFollowUps > 5 ? 'warning' : 'default'} />
        <StatCard icon={CheckCircle2} label="Completed Follow-ups" value={stats.completedFollowUps} variant="success" />
      </div>

      {/* Learned Lessons */}
      {stats.recentLessons.length > 0 && (
        <div className="panel p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> Learned Intelligence
          </h3>
          <div className="space-y-3">
            {stats.recentLessons.map((l, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20 border border-border/30">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold',
                  l.outcome === 'success' ? 'bg-exec-success/15 text-exec-success' :
                  l.outcome === 'failure' ? 'bg-destructive/15 text-destructive' :
                  'bg-exec-warning/15 text-exec-warning'
                )}>
                  {l.outcome === 'success' ? '✓' : l.outcome === 'failure' ? '✗' : '~'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90 leading-relaxed">{l.lesson}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="text-[10px]">{l.action_type}</Badge>
                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(l.at), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Follow-ups Tab ────────────────────────────────────────────────────────
function FollowUpsTab({ agentId }: { agentId: string }) {
  const { followUps, isLoading, completeFollowUp, isCompleting, stats } = useAgentFollowUps(agentId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const pending = followUps.filter(f => f.status === 'pending');
  const completed = followUps.filter(f => f.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Clock} label="Pending" value={stats.pending} variant={stats.pending > 0 ? 'warning' : 'default'} />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} variant={stats.overdue > 0 ? 'danger' : 'default'} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} variant="success" />
      </div>

      {/* Pending List */}
      <div className="panel p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Pending Follow-ups</h3>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 opacity-60">All caught up — no pending follow-ups</p>
        ) : (
          <div className="space-y-3">
            {pending.map(f => {
              const isOverdue = new Date(f.due_at) < new Date();
              return (
                <div key={f.id} className={cn(
                  'p-4 rounded-lg border bg-secondary/10 flex items-start gap-4',
                  isOverdue ? 'border-destructive/40' : 'border-border/30'
                )}>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{f.follow_up_type}</Badge>
                      <Badge variant={f.priority === 'critical' ? 'destructive' : 'secondary'} className="text-[10px]">{f.priority}</Badge>
                      {f.auto_created && <Badge variant="secondary" className="text-[10px]">Auto-created</Badge>}
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">{f.description}</p>
                    <p className={cn('text-xs', isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground')}>
                      Due {formatDistanceToNow(new Date(f.due_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    disabled={isCompleting}
                    onClick={() => completeFollowUp({ followUpId: f.id }).then(() => toast.success('Follow-up completed'))}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed List */}
      {completed.length > 0 && (
        <div className="panel p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Completed</h3>
          <div className="space-y-2">
            {completed.slice(0, 10).map(f => (
              <div key={f.id} className="p-3 rounded-lg border border-border/20 bg-secondary/5 flex items-center gap-3 opacity-70">
                <CheckCircle2 className="w-4 h-4 text-exec-success shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/80 truncate">{f.description}</p>
                  {f.completion_notes && <p className="text-xs text-muted-foreground mt-0.5">{f.completion_notes}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {f.completed_at && formatDistanceToNow(new Date(f.completed_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Delegations Tab ───────────────────────────────────────────────────────
function DelegationsTab({ agentId }: { agentId: string }) {
  const { delegations, isLoading, stats } = useAgentDelegations(agentId);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Clock} label="Pending" value={stats.pending} />
        <StatCard icon={Activity} label="In Progress" value={stats.inProgress} variant="warning" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} variant="success" />
      </div>

      <div className="panel p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Cross-Agent Coordination</h3>
        {delegations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 opacity-60">No delegations yet</p>
        ) : (
          <div className="space-y-3">
            {delegations.map(d => {
              const isOutbound = d.from_agent_id === agentId;
              return (
                <div key={d.id} className="p-4 rounded-lg border border-border/30 bg-secondary/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                      isOutbound ? 'bg-primary/15 text-primary' : 'bg-exec-warning/15 text-exec-warning'
                    )}>
                      {isOutbound ? '→' : '←'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {isOutbound ? 'Delegated task' : 'Received task'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isOutbound ? `To agent ${d.to_agent_id.slice(0, 8)}...` : `From agent ${d.from_agent_id.slice(0, 8)}...`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{d.delegation_type}</Badge>
                      <Badge variant={d.status === 'completed' ? 'default' : d.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">
                        {d.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{d.task_description}</p>
                  <p className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Instructions Tab ──────────────────────────────────────────────────────
function InstructionsTab({ agent }: { agent: Agent }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newInstruction, setNewInstruction] = useState({ instructions: '', priority: 0, deliverables: '' });
  const { instructions, isLoading, createInstruction, updateInstruction, deleteInstruction, isCreating } = useAgentInstructions(agent.id);

  const handleCreate = async () => {
    if (!newInstruction.instructions.trim()) { toast.error('Instructions are required'); return; }
    try {
      await createInstruction({
        agent_id: agent.id,
        instructions: newInstruction.instructions.trim(),
        priority: newInstruction.priority,
        deliverables: newInstruction.deliverables ? newInstruction.deliverables.split(',').map(d => d.trim()).filter(Boolean) : [],
      });
      toast.success('Instruction created');
      setShowCreate(false);
      setNewInstruction({ instructions: '', priority: 0, deliverables: '' });
    } catch { toast.error('Failed to create instruction'); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Active Directives</h3>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="w-3.5 h-3.5" /> Add Instruction
        </Button>
      </div>

      {showCreate && (
        <div className="panel p-5 space-y-4 border-primary/30">
          <div className="space-y-2">
            <Label className="text-sm">Instructions *</Label>
            <Textarea
              value={newInstruction.instructions}
              onChange={(e) => setNewInstruction({ ...newInstruction, instructions: e.target.value })}
              placeholder="Describe what this agent should do..."
              rows={4}
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Priority (0-10)</Label>
              <Input type="number" min={0} max={10} value={newInstruction.priority}
                onChange={(e) => setNewInstruction({ ...newInstruction, priority: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Deliverables</Label>
              <Input value={newInstruction.deliverables}
                onChange={(e) => setNewInstruction({ ...newInstruction, deliverables: e.target.value })}
                placeholder="Report, Email, Analysis" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create
            </Button>
          </div>
        </div>
      )}

      {instructions.length === 0 ? (
        <div className="panel p-8 text-center">
          <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No instructions configured yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add directives to guide this agent's behavior</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instructions.map(inst => (
            <div key={inst.id} className={cn(
              'panel p-4 space-y-3',
              !inst.is_active && 'opacity-40'
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground/90 leading-relaxed">{inst.instructions}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-[10px] font-mono">P{inst.priority}</Badge>
                  <button onClick={() => updateInstruction({ id: inst.id, updates: { is_active: !(inst.is_active ?? true) } })}
                    className="p-1.5 hover:bg-secondary rounded-md transition-colors">
                    {inst.is_active ? <ToggleRight className="w-4 h-4 text-exec-success" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => { deleteInstruction(inst.id); toast.success('Deleted'); }}
                    className="p-1.5 hover:bg-secondary rounded-md transition-colors text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {inst.deliverables && inst.deliverables.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {inst.deliverables.map((d, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{d}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────
export function AgentDetailModal({ agent, open, onOpenChange }: AgentDetailModalProps) {
  const status = agent.status || 'available';
  const quotaMax = agent.quota_max || 1500;
  const quotaUsed = agent.quota_used || 0;
  const quotaPercent = Math.round((quotaUsed / quotaMax) * 100);
  const activeTasks = agent.active_tasks || 0;
  const maxCapacity = agent.max_capacity || 5;
  const isTechOps = isTechOpsAgent(agent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[92vh] h-auto p-0 gap-0 overflow-hidden border-border/60 bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-secondary/10">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl shrink-0">
              {agent.emoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-foreground truncate">{agent.name}</h2>
                <div className="flex items-center gap-1.5">
                  <div className={statusConfig[status].dotClass} />
                  <span className="text-xs font-medium text-muted-foreground">{statusConfig[status].label}</span>
                </div>
                {isTechOps && (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Terminal className="w-3 h-3" /> TechOps
                  </Badge>
                )}
                {agent.is_system_agent && (
                  <Badge variant="secondary" className="text-[10px]">System Agent</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-[500px]">{agent.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {/* Capacity + Quota */}
            <div className="text-right space-y-1">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-muted-foreground">Capacity</span>
                <span className="text-sm font-mono font-semibold text-foreground">{activeTasks}/{maxCapacity}</span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-muted-foreground">Quota</span>
                <span className={cn('text-sm font-mono font-semibold', quotaPercent > 90 ? 'text-destructive' : quotaPercent > 70 ? 'text-exec-warning' : 'text-foreground')}>
                  {quotaPercent}%
                </span>
              </div>
              <Progress
                value={quotaPercent}
                className={cn(
                  "h-1.5 w-32 bg-secondary/50",
                  quotaPercent > 80 && "[&>div]:bg-exec-warning",
                  quotaPercent > 95 && "[&>div]:bg-destructive"
                )}
              />
            </div>
          </div>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0">
          <div className="px-6 border-b border-border/30 bg-secondary/5">
            <TabsList className="h-11 bg-transparent p-0 gap-0 rounded-none">
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-4 h-11 gap-1.5">
                <Eye className="w-4 h-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="performance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-4 h-11 gap-1.5">
                <BarChart3 className="w-4 h-4" /> Intelligence
              </TabsTrigger>
              <TabsTrigger value="follow-ups" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-4 h-11 gap-1.5">
                <Clock className="w-4 h-4" /> Follow-ups
              </TabsTrigger>
              <TabsTrigger value="delegations" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-4 h-11 gap-1.5">
                <Network className="w-4 h-4" /> Coordination
              </TabsTrigger>
              <TabsTrigger value="instructions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-4 h-11 gap-1.5">
                <FileText className="w-4 h-4" /> Instructions
              </TabsTrigger>
              {isTechOps && (
                <TabsTrigger value="devops" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent text-sm px-4 h-11 gap-1.5">
                  <Cpu className="w-4 h-4" /> DevOps
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <ScrollArea className="flex-1" style={{ maxHeight: 'calc(92vh - 160px)' }}>
            <div className="p-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                {/* Agent Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard icon={Activity} label="Active Tasks" value={`${activeTasks}/${maxCapacity}`}
                    variant={activeTasks >= maxCapacity ? 'danger' : 'default'} />
                  <StatCard icon={Zap} label="Quota Used" value={`${quotaUsed}/${quotaMax}`}
                    variant={quotaPercent > 90 ? 'danger' : quotaPercent > 70 ? 'warning' : 'default'} />
                  <StatCard icon={Target} label="Status" value={statusConfig[status].label}
                    variant={status === 'error' ? 'danger' : status === 'busy' ? 'warning' : 'success'} />
                  <StatCard icon={Shield} label="Type" value={agent.is_system_agent ? 'System' : 'Custom'} />
                </div>

                {/* Description */}
                <div className="panel p-5">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Role & Specialization</h3>
                  <p className="text-sm text-foreground/90 leading-relaxed">{agent.role}</p>
                  {agent.description && (
                    <p className="text-sm text-foreground/70 leading-relaxed mt-3 pt-3 border-t border-border/20">{agent.description}</p>
                  )}
                </div>

                {/* Config */}
                {agent.config && Object.keys(agent.config as Record<string, unknown>).length > 0 && (
                  <div className="panel p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Configuration</h3>
                    <pre className="text-xs font-mono text-foreground/70 bg-secondary/20 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words">
                      {JSON.stringify(agent.config, null, 2)}
                    </pre>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="performance" className="mt-0">
                <PerformanceTab agentId={agent.id} />
              </TabsContent>

              <TabsContent value="follow-ups" className="mt-0">
                <FollowUpsTab agentId={agent.id} />
              </TabsContent>

              <TabsContent value="delegations" className="mt-0">
                <DelegationsTab agentId={agent.id} />
              </TabsContent>

              <TabsContent value="instructions" className="mt-0">
                <InstructionsTab agent={agent} />
              </TabsContent>

              {isTechOps && (
                <TabsContent value="devops" className="mt-0">
                  <DevOpsAgentView />
                </TabsContent>
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
