import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Sparkles, Check, Circle, AlertCircle, Workflow as WorkflowIcon,
  Plus, Play, Trash2, ChevronDown, ChevronUp, Loader2, Settings2,
  Clock, Zap, XCircle, PauseCircle, RotateCcw, GripVertical,
  Brain, ArrowRight, Shield, MessageSquare,
} from 'lucide-react';
import { useWorkflows, WorkflowWithSteps } from '@/hooks/useWorkflows';
import { useAgents } from '@/hooks/useAgents';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface WorkflowsPanelProps {
  className?: string;
}

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email', icon: '📧' },
  { value: 'update_client', label: 'Update Client', icon: '📝' },
  { value: 'create_task', label: 'Create Task', icon: '📋' },
  { value: 'generate_report', label: 'Generate Report', icon: '📊' },
  { value: 'notification', label: 'Send Notification', icon: '🔔' },
  { value: 'ai_analysis', label: 'AI Analysis', icon: '🧠' },
  { value: 'api_call', label: 'API Call', icon: '🔗' },
  { value: 'approval_gate', label: 'Approval Gate', icon: '⚖️' },
  { value: 'data_update', label: 'Data Update', icon: '💾' },
];

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'on_client_created', label: 'Client Created' },
  { value: 'on_email_received', label: 'Email Received' },
  { value: 'on_schedule', label: 'Scheduled' },
  { value: 'on_event', label: 'Event Trigger' },
];

const STEP_STATUS_CONFIG: Record<string, { icon: React.ReactNode; className: string }> = {
  not_started: { icon: <Circle className="w-3 h-3 text-muted-foreground/40" />, className: 'bg-secondary/40 text-muted-foreground border border-border/20' },
  in_progress: { icon: <Loader2 className="w-3 h-3 animate-spin text-primary" />, className: 'bg-primary/15 text-primary border border-primary/20' },
  completed: { icon: <Check className="w-3 h-3 text-exec-success" />, className: 'badge-success' },
  failed: { icon: <XCircle className="w-3 h-3 text-exec-danger" />, className: 'badge-danger' },
};

type ViewMode = 'list' | 'create' | 'detail' | 'ai_generate';

export function WorkflowsPanel({ className }: WorkflowsPanelProps) {
  const {
    workflows, isLoading, createWorkflow, deleteWorkflow,
    executeWorkflow, executeStep, generateWorkflow,
    isCreating, isExecuting, isExecutingStep, isGenerating,
    stats,
  } = useWorkflows();
  const { agents } = useAgents();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowWithSteps | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [executingStepId, setExecutingStepId] = useState<string | null>(null);
  const [lastExecutionResult, setLastExecutionResult] = useState<Record<string, unknown> | null>(null);

  // ── AI Generate state
  const [aiPrompt, setAiPrompt] = useState('');

  // ── Create form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTrigger, setNewTrigger] = useState('manual');
  const [newSteps, setNewSteps] = useState<Array<{
    name: string;
    action_type: string;
    description: string;
    agent_id: string;
  }>>([{ name: '', action_type: 'send_email', description: '', agent_id: '' }]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Workflow name is required');
      return;
    }
    if (newSteps.some(s => !s.name.trim())) {
      toast.error('All steps must have a name');
      return;
    }

    try {
      await createWorkflow({
        name: newName,
        description: newDescription || undefined,
        trigger_type: newTrigger,
        steps: newSteps.map(s => ({
          name: s.name,
          description: s.description || undefined,
          action_type: s.action_type,
          agent_id: s.agent_id || undefined,
        })),
      });
      toast.success('Workflow created');
      resetForm();
      setViewMode('list');
    } catch (err) {
      toast.error('Failed to create workflow');
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Describe what workflow you want');
      return;
    }
    try {
      const result = await generateWorkflow(aiPrompt);
      toast.success(`AI created workflow "${result.generated?.name}" with ${result.generated?.steps?.length || 0} steps`);
      setAiPrompt('');
      setViewMode('list');
    } catch (err) {
      toast.error('AI workflow generation failed');
    }
  };

  const handleExecute = async (id: string) => {
    setExecutingId(id);
    setLastExecutionResult(null);
    try {
      const result = await executeWorkflow(id);
      setLastExecutionResult(result);
      if (result.success) {
        toast.success(`Workflow completed: ${result.stepResults?.filter((s: { status: string }) => s.status === 'completed').length}/${result.stepResults?.length} steps (AI-reasoned)`);
      } else {
        toast.warning(`Workflow ${result.status}: ${result.stepResults?.filter((s: { status: string }) => s.status === 'completed').length}/${result.stepResults?.length} steps`);
      }
    } catch {
      toast.error('Workflow execution failed');
    } finally {
      setExecutingId(null);
    }
  };

  const handleExecuteStep = async (stepId: string) => {
    setExecutingStepId(stepId);
    try {
      const result = await executeStep(stepId);
      toast.success(result.success ? `Step executed (AI confidence: ${(result.aiReasoning?.confidence * 100).toFixed(0)}%)` : 'Step failed');
    } catch {
      toast.error('Step execution failed');
    } finally {
      setExecutingStepId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkflow(id);
      toast.success('Workflow deleted');
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(null);
        setViewMode('list');
      }
    } catch {
      toast.error('Failed to delete workflow');
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewDescription('');
    setNewTrigger('manual');
    setNewSteps([{ name: '', action_type: 'send_email', description: '', agent_id: '' }]);
  };

  const addStep = () => {
    setNewSteps(prev => [...prev, { name: '', action_type: 'send_email', description: '', agent_id: '' }]);
  };

  const removeStep = (index: number) => {
    if (newSteps.length > 1) {
      setNewSteps(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, field: string, value: string) => {
    setNewSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  if (isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Workflows</div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('panel', className)}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WorkflowIcon className="w-3.5 h-3.5 text-primary" />
          <span>Workflows</span>
          {stats.total > 0 && (
            <span className="text-[10px] text-muted-foreground">({stats.active} active)</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {viewMode !== 'list' && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => { setViewMode('list'); setSelectedWorkflow(null); }}>
              ← Back
            </Button>
          )}
          {viewMode === 'list' && (
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => setViewMode('ai_generate')}>
                <Brain className="w-3 h-3" /> AI Create
              </Button>
              <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => setViewMode('create')}>
                <Plus className="w-3 h-3" /> Manual
              </Button>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="max-h-[500px]">
        <div className="p-3 space-y-3">
          {/* ── AI Generate View ──────────────────────── */}
          {viewMode === 'ai_generate' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/20 p-3 space-y-1" style={{ background: 'hsl(var(--primary) / 0.05)' }}>
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <span className="text-[12px] font-bold text-foreground">AI Workflow Architect</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Describe what you want in natural language. AI will design the workflow, assign agents, and configure each step.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">What should this workflow do?</label>
                <Textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g., When a new client signs up, send a welcome email, create an onboarding task, assign to the Client Success agent, and schedule a follow-up call in 7 days..."
                  className="min-h-[100px] text-[12px]"
                />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground">💡 Try these:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Onboard new client with welcome email and follow-up',
                    'Monthly client health check with AI analysis and report',
                    'High-risk churn intervention with escalation',
                    'Renewal workflow with approval gate',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      className="text-[9px] px-2 py-1 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                      onClick={() => setAiPrompt(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <Button className="w-full h-8 text-[12px] font-semibold gap-1" onClick={handleAIGenerate} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {isGenerating ? 'AI is designing your workflow...' : 'Generate Workflow with AI'}
              </Button>
            </div>
          )}

          {/* ── List View ─────────────────────────────── */}
          {viewMode === 'list' && (
            workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <WorkflowIcon className="w-6 h-6 text-muted-foreground mb-2 opacity-40" />
                <p className="text-xs text-muted-foreground">No workflows yet</p>
                <p className="text-[10px] text-muted-foreground mt-1">Let AI design workflows or create manually</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="default" className="h-7 text-[11px] gap-1" onClick={() => setViewMode('ai_generate')}>
                    <Brain className="w-3 h-3" /> AI Create
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setViewMode('create')}>
                    <Plus className="w-3 h-3" /> Manual
                  </Button>
                </div>
              </div>
            ) : (
              workflows.map(wf => (
                <WorkflowCard
                  key={wf.id}
                  workflow={wf}
                  isExecuting={executingId === wf.id}
                  onExecute={() => handleExecute(wf.id)}
                  onDelete={() => handleDelete(wf.id)}
                  onSelect={() => { setSelectedWorkflow(wf); setViewMode('detail'); }}
                />
              ))
            )
          )}

          {/* ── Create View ───────────────────────────── */}
          {viewMode === 'create' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Workflow Name</label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., Client Onboarding"
                  className="h-8 text-[12px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                <Input
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="What does this workflow do?"
                  className="h-8 text-[12px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Trigger</label>
                <Select value={newTrigger} onValueChange={setNewTrigger}>
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-[12px]">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Steps</label>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addStep}>
                    <Plus className="w-3 h-3" /> Add Step
                  </Button>
                </div>

                <div className="space-y-2">
                  {newSteps.map((step, index) => (
                    <div key={index} className="rounded-lg border border-border/40 p-2.5 space-y-2" style={{ background: 'hsl(var(--bg-soft) / 0.3)' }}>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                          {index + 1}
                        </div>
                        <Input
                          value={step.name}
                          onChange={e => updateStep(index, 'name', e.target.value)}
                          placeholder="Step name"
                          className="h-7 text-[11px] flex-1"
                        />
                        {newSteps.length > 1 && (
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => removeStep(index)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Select value={step.action_type} onValueChange={v => updateStep(index, 'action_type', v)}>
                          <SelectTrigger className="h-7 text-[10px] flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTION_TYPES.map(a => (
                              <SelectItem key={a.value} value={a.value} className="text-[11px]">
                                {a.icon} {a.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {agents.length > 0 && (
                          <Select value={step.agent_id || 'auto'} onValueChange={v => updateStep(index, 'agent_id', v === 'auto' ? '' : v)}>
                            <SelectTrigger className="h-7 text-[10px] flex-1">
                              <SelectValue placeholder="Agent" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto" className="text-[11px]">🤖 Auto-assign</SelectItem>
                              {agents.map(a => (
                                <SelectItem key={a.id} value={a.id} className="text-[11px]">
                                  {a.emoji} {a.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button className="w-full h-8 text-[12px] font-semibold" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                Create Workflow
              </Button>
            </div>
          )}

          {/* ── Detail View ───────────────────────────── */}
          {viewMode === 'detail' && selectedWorkflow && (
            <WorkflowDetailView
              workflow={selectedWorkflow}
              isExecuting={executingId === selectedWorkflow.id}
              executingStepId={executingStepId}
              executionResult={lastExecutionResult}
              onExecute={() => handleExecute(selectedWorkflow.id)}
              onExecuteStep={handleExecuteStep}
              onDelete={() => handleDelete(selectedWorkflow.id)}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Workflow Card ──────────────────────────────────────────────────────────────

function WorkflowCard({
  workflow, isExecuting, onExecute, onDelete, onSelect,
}: {
  workflow: WorkflowWithSteps;
  isExecuting: boolean;
  onExecute: () => void;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const steps = workflow.workflow_steps || [];
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <div
      className="rounded-lg border border-border/40 p-3 space-y-2 cursor-pointer hover:border-primary/30 transition-colors"
      style={{ background: 'hsl(var(--bg-soft) / 0.2)' }}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-semibold text-foreground truncate">{workflow.name}</h4>
            {!workflow.is_active && (
              <Badge variant="outline" className="text-[9px] h-4">Inactive</Badge>
            )}
          </div>
          {workflow.description && (
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{workflow.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={onExecute} disabled={isExecuting}>
            {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {steps.length > 0 && (
        <div className="space-y-1">
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>{steps.length} steps</span>
            <span>{workflow.execution_count || 0} runs</span>
            <span className="capitalize">{workflow.trigger_type}</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {steps.slice(0, 5).map((step, i) => {
          const cfg = STEP_STATUS_CONFIG[step.status] || STEP_STATUS_CONFIG.not_started;
          return (
            <span key={step.id} className={cn('text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5', cfg.className)}>
              {cfg.icon} {i + 1}
            </span>
          );
        })}
        {steps.length > 5 && (
          <span className="text-[9px] text-muted-foreground px-1">+{steps.length - 5}</span>
        )}
      </div>
    </div>
  );
}

// ── AI Reasoning Badge ────────────────────────────────────────────────────────

function AIReasoningBadge({ reasoning }: { reasoning: { interpretation: string; approach: string; riskAssessment: string; confidence: number } }) {
  const confidence = reasoning.confidence || 0;
  const color = confidence >= 0.8 ? 'text-exec-success' : confidence >= 0.5 ? 'text-amber-500' : 'text-exec-danger';

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1 text-[9px] text-primary/80 hover:text-primary transition-colors">
          <Brain className="w-3 h-3" />
          AI Reasoning ({(confidence * 100).toFixed(0)}%)
          <ChevronDown className="w-2.5 h-2.5" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 rounded-md border border-primary/15 p-2 space-y-1.5" style={{ background: 'hsl(var(--primary) / 0.04)' }}>
          <div className="flex items-start gap-1.5">
            <MessageSquare className="w-3 h-3 text-primary mt-0.5 shrink-0" />
            <p className="text-[10px] text-foreground/80">{reasoning.interpretation}</p>
          </div>
          <div className="flex items-start gap-1.5">
            <ArrowRight className="w-3 h-3 text-primary mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">Approach: <span className="text-foreground/70">{reasoning.approach}</span></p>
          </div>
          <div className="flex items-start gap-1.5">
            <Shield className="w-3 h-3 text-primary mt-0.5 shrink-0" />
            <p className="text-[10px] text-muted-foreground">Risk: <span className="text-foreground/70">{reasoning.riskAssessment}</span></p>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary shrink-0" />
            <span className={cn('text-[10px] font-semibold', color)}>Confidence: {(confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Workflow Detail View ──────────────────────────────────────────────────────

function WorkflowDetailView({
  workflow, isExecuting, executingStepId, executionResult, onExecute, onExecuteStep, onDelete,
}: {
  workflow: WorkflowWithSteps;
  isExecuting: boolean;
  executingStepId: string | null;
  executionResult: Record<string, unknown> | null;
  onExecute: () => void;
  onExecuteStep: (stepId: string) => void;
  onDelete: () => void;
}) {
  const steps = workflow.workflow_steps || [];
  const stepResults = (executionResult?.stepResults || []) as Array<{
    stepId: string;
    stepName: string;
    status: string;
    aiReasoning?: { interpretation: string; approach: string; riskAssessment: string; confidence: number };
    output?: Record<string, unknown>;
    duration_ms?: number;
    error?: string;
  }>;

  return (
    <div className="space-y-4">
      {/* Workflow Header */}
      <div className="space-y-1">
        <h3 className="text-[14px] font-bold text-foreground">{workflow.name}</h3>
        {workflow.description && (
          <p className="text-[11px] text-muted-foreground">{workflow.description}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="text-[9px] gap-1">
            <Clock className="w-3 h-3" />
            {workflow.trigger_type}
          </Badge>
          <Badge variant="outline" className="text-[9px] gap-1">
            <Zap className="w-3 h-3" />
            {workflow.execution_count || 0} executions
          </Badge>
          <Badge variant="outline" className="text-[9px] gap-1">
            <Brain className="w-3 h-3" />
            AI-Reasoned
          </Badge>
          {workflow.last_executed_at && (
            <Badge variant="outline" className="text-[9px]">
              Last: {new Date(workflow.last_executed_at).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </div>

      {/* Execution Result Summary */}
      {executionResult && (
        <div className={cn(
          'rounded-lg border p-2.5 space-y-1',
          executionResult.success ? 'border-exec-success/30 bg-exec-success/5' : 'border-exec-danger/30 bg-exec-danger/5'
        )}>
          <div className="flex items-center gap-2">
            {executionResult.success ? <Check className="w-3.5 h-3.5 text-exec-success" /> : <AlertCircle className="w-3.5 h-3.5 text-exec-danger" />}
            <span className="text-[11px] font-semibold text-foreground">
              {executionResult.success ? 'Workflow Completed' : `Workflow ${executionResult.status}`}
            </span>
            <span className="text-[9px] text-muted-foreground ml-auto">{executionResult.duration_ms}ms</span>
          </div>
          {executionResult.contextChainDepth && (
            <p className="text-[10px] text-muted-foreground">
              Context chain: {String(executionResult.contextChainDepth)} steps linked • AI-reasoned execution
            </p>
          )}
        </div>
      )}

      {/* Execute / Delete controls */}
      <div className="flex gap-2">
        <Button className="flex-1 h-8 text-[11px] font-semibold gap-1" onClick={onExecute} disabled={isExecuting}>
          {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Brain className="w-3 h-3" /><Play className="w-3 h-3" /></>}
          {isExecuting ? 'AI Reasoning & Executing...' : 'Execute with AI'}
        </Button>
        <Button variant="destructive" size="sm" className="h-8 text-[11px]" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {/* Steps */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Steps ({steps.length})</p>
        {steps.map((step, index) => {
          const cfg = STEP_STATUS_CONFIG[step.status] || STEP_STATUS_CONFIG.not_started;
          const isStepExecuting = executingStepId === step.id;
          const actionType = ACTION_TYPES.find(a => a.value === step.action_type);
          const stepResult = stepResults.find(r => r.stepId === step.id);

          return (
            <div key={step.id} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-[14px] top-[40px] bottom-[-8px] w-[2px] bg-border/40" />
              )}

              <div
                className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border/30 transition-colors hover:border-border/60"
                style={{ background: 'hsl(var(--bg-soft) / 0.15)' }}
              >
                {/* Step number */}
                <div className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold shrink-0 border',
                  step.status === 'completed' ? 'bg-exec-success/15 border-exec-success/30 text-exec-success' :
                  step.status === 'in_progress' ? 'bg-primary/15 border-primary/30 text-primary' :
                  step.status === 'failed' ? 'bg-exec-danger/15 border-exec-danger/30 text-exec-danger' :
                  'bg-muted border-border/40 text-muted-foreground'
                )}>
                  {step.status === 'completed' ? <Check className="w-3.5 h-3.5" /> :
                   step.status === 'in_progress' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                   step.status === 'failed' ? <XCircle className="w-3.5 h-3.5" /> :
                   index + 1}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{actionType?.icon || '⚙️'}</span>
                    <span className="text-[12px] font-semibold text-foreground truncate">{step.name}</span>
                  </div>
                  {step.description && (
                    <p className="text-[10px] text-muted-foreground">{step.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', cfg.className)}>
                      {step.status.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{actionType?.label || step.action_type}</span>
                    {stepResult?.duration_ms && (
                      <span className="text-[9px] text-muted-foreground">{stepResult.duration_ms}ms</span>
                    )}
                  </div>

                  {/* AI Reasoning display */}
                  {stepResult?.aiReasoning && (
                    <AIReasoningBadge reasoning={stepResult.aiReasoning} />
                  )}

                  {/* Error */}
                  {stepResult?.error && (
                    <p className="text-[9px] text-exec-danger mt-1">⚠ {stepResult.error}</p>
                  )}
                </div>

                {/* Step actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {step.status !== 'completed' && step.ai_assist_available && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[9px] px-1.5 gap-0.5 border-primary/20 text-primary hover:bg-primary/10"
                      onClick={() => onExecuteStep(step.id)}
                      disabled={isStepExecuting}
                    >
                      {isStepExecuting ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <><Brain className="w-2.5 h-2.5" />Run</>}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
