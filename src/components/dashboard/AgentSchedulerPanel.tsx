import { useState } from 'react';
import { useScheduledTasks } from '@/hooks/useScheduledTasks';
import { useAgents } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Calendar, Clock, Play, Pause, RotateCcw, Plus, Trash2,
  AlertTriangle, CheckCircle2, Timer, Zap, TrendingUp, RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const TASK_TYPES = [
  { value: 'command', label: 'Command', icon: '⚡' },
  { value: 'action_pipeline', label: 'Action Pipeline', icon: '🔧' },
  { value: 'workflow', label: 'Workflow', icon: '🔄' },
  { value: 'notification', label: 'Notification', icon: '🔔' },
  { value: 'data_sync', label: 'Data Sync', icon: '📡' },
  { value: 'report', label: 'Report', icon: '📊' },
];

const FREQUENCIES = [
  { value: 'once', label: 'Once' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  active: { color: 'bg-[hsl(var(--accent-success))]/15 text-[hsl(var(--accent-success))] border-[hsl(var(--accent-success))]/20', icon: CheckCircle2 },
  paused: { color: 'bg-[hsl(var(--accent-warning))]/15 text-[hsl(var(--accent-warning))] border-[hsl(var(--accent-warning))]/20', icon: Pause },
  completed: { color: 'bg-[hsl(var(--accent-info))]/15 text-[hsl(var(--accent-info))] border-[hsl(var(--accent-info))]/20', icon: CheckCircle2 },
  failed: { color: 'bg-[hsl(var(--accent-danger))]/15 text-[hsl(var(--accent-danger))] border-[hsl(var(--accent-danger))]/20', icon: AlertTriangle },
  expired: { color: 'bg-muted text-muted-foreground border-border', icon: Clock },
};

export function AgentSchedulerPanel() {
  const { tasks, executions, isLoading, createTask, isCreating, updateStatus, executeNow, deleteTask, stats, upcomingTasks } = useScheduledTasks();
  const { agents } = useAgents();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    task_type: 'command',
    frequency: 'once',
    scheduled_at: '',
    agent_id: '',
    priority: 5,
    task_config: '{}',
  });

  const handleCreate = async () => {
    if (!newTask.name.trim()) {
      toast.error('Task name is required');
      return;
    }
    try {
      let config: Record<string, unknown>;
      try {
        config = JSON.parse(newTask.task_config);
      } catch {
        toast.error('Invalid JSON in task config');
        return;
      }

      await createTask({
        name: newTask.name,
        description: newTask.description || undefined,
        task_type: newTask.task_type,
        frequency: newTask.frequency as 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly',
        scheduled_at: newTask.scheduled_at || new Date().toISOString(),
        agent_id: newTask.agent_id || undefined,
        priority: newTask.priority,
        task_config: config,
      });
      toast.success('Task scheduled');
      setShowCreate(false);
      setNewTask({ name: '', description: '', task_type: 'command', frequency: 'once', scheduled_at: '', agent_id: '', priority: 5, task_config: '{}' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const handleAction = async (taskId: string, action: 'pause' | 'resume' | 'cancel' | 'execute' | 'delete') => {
    try {
      switch (action) {
        case 'pause': await updateStatus({ taskId, status: 'paused' }); break;
        case 'resume': await updateStatus({ taskId, status: 'active' }); break;
        case 'cancel': await updateStatus({ taskId, status: 'completed' }); break;
        case 'execute': await executeNow(taskId); break;
        case 'delete': await deleteTask(taskId); break;
      }
      toast.success(`Task ${action}d`);
    } catch {
      toast.error(`Failed to ${action} task`);
    }
  };

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Agent Scheduler
          </CardTitle>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-3 h-3" />
            Schedule
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {[
            { label: 'Active', value: stats.active, icon: Zap, color: 'text-[hsl(var(--accent-success))]' },
            { label: 'Paused', value: stats.paused, icon: Pause, color: 'text-[hsl(var(--accent-warning))]' },
            { label: 'Failed', value: stats.failed, icon: AlertTriangle, color: 'text-[hsl(var(--accent-danger))]' },
            { label: 'Runs', value: stats.totalExecutions, icon: TrendingUp, color: 'text-primary' },
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center gap-0.5 p-1.5 rounded-md bg-secondary/30">
              <stat.icon className={`w-3 h-3 ${stat.color}`} />
              <span className="text-xs font-bold text-foreground">{stat.value}</span>
              <span className="text-[9px] text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Create form */}
        {showCreate && (
          <div className="space-y-2 p-3 rounded-lg bg-secondary/20 border border-border/30 mb-3">
            <Input
              placeholder="Task name..."
              value={newTask.name}
              onChange={e => setNewTask(p => ({ ...p, name: e.target.value }))}
              className="h-8 text-xs bg-background/50"
            />
            <Textarea
              placeholder="Description (optional)..."
              value={newTask.description}
              onChange={e => setNewTask(p => ({ ...p, description: e.target.value }))}
              className="min-h-[50px] text-xs bg-background/50"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={newTask.task_type} onValueChange={v => setNewTask(p => ({ ...p, task_type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newTask.frequency} onValueChange={v => setNewTask(p => ({ ...p, frequency: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="datetime-local"
                value={newTask.scheduled_at ? newTask.scheduled_at.slice(0, 16) : ''}
                onChange={e => setNewTask(p => ({ ...p, scheduled_at: new Date(e.target.value).toISOString() }))}
                className="h-8 text-xs bg-background/50"
              />
              <Select value={newTask.agent_id || 'none'} onValueChange={v => setNewTask(p => ({ ...p, agent_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Agent" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">No agent</SelectItem>
                  {agents.map(a => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">{a.emoji} {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder='Task config (JSON)...'
              value={newTask.task_config}
              onChange={e => setNewTask(p => ({ ...p, task_config: e.target.value }))}
              className="min-h-[40px] text-xs font-mono bg-background/50"
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Create
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-8 bg-secondary/30 p-0.5">
            <TabsTrigger value="upcoming" className="flex-1 text-[10px] h-7 data-[state=active]:bg-primary/15">
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1 text-[10px] h-7 data-[state=active]:bg-primary/15">
              All Tasks
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-[10px] h-7 data-[state=active]:bg-primary/15">
              History
            </TabsTrigger>
          </TabsList>

          {/* Upcoming */}
          <TabsContent value="upcoming" className="mt-2">
            <ScrollArea className="max-h-[400px]">
              {isLoading ? (
                <div className="text-center text-xs text-muted-foreground py-6">Loading...</div>
              ) : upcomingTasks.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6">No upcoming tasks</div>
              ) : (
                <div className="space-y-1.5">
                  {upcomingTasks.map(task => (
                    <TaskRow key={task.id} task={task} agents={agents} onAction={handleAction} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* All */}
          <TabsContent value="all" className="mt-2">
            <ScrollArea className="max-h-[400px]">
              {tasks.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6">No tasks</div>
              ) : (
                <div className="space-y-1.5">
                  {tasks.map(task => (
                    <TaskRow key={task.id} task={task} agents={agents} onAction={handleAction} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="mt-2">
            <ScrollArea className="max-h-[400px]">
              {executions.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-6">No execution history</div>
              ) : (
                <div className="space-y-1">
                  {executions.slice(0, 30).map(exec => (
                    <div key={exec.id} className="flex items-center gap-2 p-2 rounded-md bg-secondary/20 border border-border/20">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        exec.status === 'completed' ? 'bg-[hsl(var(--accent-success))]' :
                        exec.status === 'failed' ? 'bg-[hsl(var(--accent-danger))]' :
                        exec.status === 'running' ? 'bg-[hsl(var(--accent-warning))] animate-pulse' :
                        'bg-muted-foreground'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-foreground truncate">
                          {exec.scheduled_task_id.slice(0, 8)}...
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {exec.started_at ? format(new Date(exec.started_at), 'MMM d, HH:mm') : '—'}
                          {exec.duration_ms != null && ` • ${exec.duration_ms}ms`}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[9px] h-4 ${
                        exec.status === 'completed' ? 'border-[hsl(var(--accent-success))]/30 text-[hsl(var(--accent-success))]' :
                        exec.status === 'failed' ? 'border-[hsl(var(--accent-danger))]/30 text-[hsl(var(--accent-danger))]' :
                        ''
                      }`}>
                        {exec.status}
                      </Badge>
                      {exec.error_message && (
                        <span className="text-[9px] text-[hsl(var(--accent-danger))] truncate max-w-[80px]" title={exec.error_message}>
                          {exec.error_message}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ─── Task Row Component ──────────────────────────────────────────────

interface TaskRowProps {
  task: {
    id: string;
    name: string;
    status: string;
    frequency: string;
    task_type: string;
    agent_id: string | null;
    next_run_at: string | null;
    last_run_at: string | null;
    execution_count: number;
    retry_count: number;
    max_retries: number;
    last_error: string | null;
    priority: number;
  };
  agents: Array<{ id: string; name: string; emoji: string }>;
  onAction: (taskId: string, action: 'pause' | 'resume' | 'cancel' | 'execute' | 'delete') => void;
}

function TaskRow({ task, agents, onAction }: TaskRowProps) {
  const config = statusConfig[task.status] || statusConfig.expired;
  const StatusIcon = config.icon;
  const agent = agents.find(a => a.id === task.agent_id);
  const taskType = TASK_TYPES.find(t => t.value === task.task_type);

  return (
    <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/20 hover:border-border/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${
            task.status === 'active' ? 'text-[hsl(var(--accent-success))]' :
            task.status === 'failed' ? 'text-[hsl(var(--accent-danger))]' :
            task.status === 'paused' ? 'text-[hsl(var(--accent-warning))]' :
            'text-muted-foreground'
          }`} />
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground truncate">{task.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {taskType && <span className="text-[9px]">{taskType.icon}</span>}
              <span className="text-[9px] text-muted-foreground">{task.frequency}</span>
              {agent && <span className="text-[9px] text-muted-foreground">{agent.emoji} {agent.name}</span>}
            </div>
          </div>
        </div>
        <Badge variant="outline" className={`text-[9px] h-4 shrink-0 ${config.color}`}>
          {task.status}
        </Badge>
      </div>

      {/* Next run / timing */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <Timer className="w-3 h-3 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground">
            {task.next_run_at
              ? `Next: ${formatDistanceToNow(new Date(task.next_run_at), { addSuffix: true })}`
              : 'No next run'}
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground">
          {task.execution_count} runs
          {task.retry_count > 0 && ` • ${task.retry_count}/${task.max_retries} retries`}
        </span>
      </div>

      {task.last_error && (
        <div className="mt-1.5 p-1.5 rounded bg-[hsl(var(--accent-danger))]/5 border border-[hsl(var(--accent-danger))]/10">
          <span className="text-[9px] text-[hsl(var(--accent-danger))] line-clamp-1">{task.last_error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 mt-2">
        {task.status === 'active' && (
          <>
            <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 gap-1" onClick={() => onAction(task.id, 'execute')}>
              <Play className="w-2.5 h-2.5" /> Run Now
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 gap-1" onClick={() => onAction(task.id, 'pause')}>
              <Pause className="w-2.5 h-2.5" /> Pause
            </Button>
          </>
        )}
        {task.status === 'paused' && (
          <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 gap-1" onClick={() => onAction(task.id, 'resume')}>
            <Play className="w-2.5 h-2.5" /> Resume
          </Button>
        )}
        {task.status === 'failed' && (
          <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 gap-1" onClick={() => onAction(task.id, 'resume')}>
            <RotateCcw className="w-2.5 h-2.5" /> Retry
          </Button>
        )}
        <div className="flex-1" />
        <Button size="sm" variant="ghost" className="h-6 text-[9px] px-2 text-[hsl(var(--accent-danger))]" onClick={() => onAction(task.id, 'delete')}>
          <Trash2 className="w-2.5 h-2.5" />
        </Button>
      </div>
    </div>
  );
}
