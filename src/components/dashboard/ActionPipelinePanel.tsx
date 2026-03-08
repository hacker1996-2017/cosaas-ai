import { useState } from 'react';
import { Check, X, Loader2, ChevronDown, ChevronUp, GitBranch, RotateCcw, Zap, Clock, CheckCircle2, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useActionPipeline } from '@/hooks/useActionPipeline';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface ActionPipelinePanelProps {
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  created:           { label: 'Created',       icon: <Clock className="w-3 h-3" />,          className: 'bg-muted text-muted-foreground' },
  policy_evaluating: { label: 'Evaluating',    icon: <Loader2 className="w-3 h-3 animate-spin" />, className: 'bg-muted text-muted-foreground' },
  pending_approval:  { label: 'Needs Approval',icon: <AlertTriangle className="w-3 h-3" />,  className: 'badge-warning' },
  approved:          { label: 'Approved',       icon: <Check className="w-3 h-3" />,          className: 'bg-primary/15 text-primary border border-primary/20' },
  dispatched:        { label: 'Dispatched',     icon: <Zap className="w-3 h-3" />,            className: 'bg-primary/15 text-primary border border-primary/20' },
  executing:         { label: 'Executing',      icon: <Loader2 className="w-3 h-3 animate-spin" />, className: 'bg-primary/20 text-primary border border-primary/30' },
  completed:         { label: 'Completed',      icon: <CheckCircle2 className="w-3 h-3" />,   className: 'badge-success' },
  failed:            { label: 'Failed',         icon: <XCircle className="w-3 h-3" />,        className: 'badge-danger' },
  rejected:          { label: 'Rejected',       icon: <X className="w-3 h-3" />,              className: 'badge-danger' },
  cancelled:         { label: 'Cancelled',      icon: <X className="w-3 h-3" />,              className: 'bg-muted text-muted-foreground' },
};

const CATEGORY_ICONS: Record<string, string> = {
  financial: '💰', communication: '📧', data_mutation: '📝',
  integration: '🔗', scheduling: '📅', reporting: '📊', system: '⚙️',
};

export function ActionPipelinePanel({ className }: ActionPipelinePanelProps) {
  const {
    actions, isLoading, approveAction, rejectAction, retryAction,
    isApproving, isRejecting, isDispatching, isRetrying,
    stats, pendingApproval, inProgress, completed, failed,
  } = useActionPipeline();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approveAction({ actionId: id });
      toast.success('Action approved — dispatching execution');
    } catch {
      toast.error('Failed to approve action');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectAction({ actionId: id });
      toast.success('Action rejected');
    } catch {
      toast.error('Failed to reject action');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRetry = async (id: string) => {
    setProcessingId(id);
    try {
      await retryAction(id);
      toast.success('Action retrying');
    } catch {
      toast.error('Retry failed');
    } finally {
      setProcessingId(null);
    }
  };

  const statusConfig = (status: string) => STATUS_CONFIG[status] || STATUS_CONFIG.created;

  if (isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Action Pipeline</div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const historyActions = [...completed, ...failed].slice(0, 10);

  return (
    <div className={cn('panel', className)}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-3.5 h-3.5 text-primary" />
          <span>Action Pipeline</span>
        </div>
        <div className="flex items-center gap-1.5">
          {stats.pendingApproval > 0 && (
            <span className="badge-warning px-2 py-0.5 rounded-full text-[10px] font-semibold">{stats.pendingApproval}</span>
          )}
          {stats.inProgress > 0 && (
            <span className="bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-semibold">{stats.inProgress}</span>
          )}
          {stats.completed > 0 && (
            <span className="badge-success px-2 py-0.5 rounded-full text-[10px] font-semibold">{stats.completed}</span>
          )}
        </div>
      </div>

      {/* ── Tab Switcher ───────────────────────────────── */}
      <div className="flex border-b border-border/40 px-3">
        {([
          { key: 'pending' as const, label: 'Pending', count: stats.pendingApproval },
          { key: 'active' as const, label: 'Active', count: stats.inProgress },
          { key: 'history' as const, label: 'History', count: stats.completed + stats.failed },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-3 py-2 text-[11px] font-semibold transition-colors relative',
              activeTab === tab.key
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-[9px] opacity-70">({tab.count})</span>
            )}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-2.5 overflow-y-auto max-h-[500px]">
        {actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Zap className="w-6 h-6 text-muted-foreground mb-2 opacity-40" />
            <p className="text-xs text-muted-foreground">No actions in pipeline</p>
            <p className="text-[10px] text-muted-foreground mt-1 opacity-60">Commands create actions that flow through here</p>
          </div>
        ) : (
          <>
            {/* ── Pending Approval Tab ─────────────────── */}
            {activeTab === 'pending' && (
              pendingApproval.length === 0 ? (
                <EmptyState icon="✅" text="No actions pending approval" />
              ) : (
                pendingApproval.map(action => (
                  <PendingActionCard
                    key={action.id}
                    action={action}
                    isExpanded={expandedId === action.id}
                    isProcessing={processingId === action.id}
                    isApproving={isApproving}
                    isRejecting={isRejecting}
                    onToggleExpand={() => setExpandedId(expandedId === action.id ? null : action.id)}
                    onApprove={() => handleApprove(action.id)}
                    onReject={() => handleReject(action.id)}
                  />
                ))
              )
            )}

            {/* ── Active Tab ──────────────────────────── */}
            {activeTab === 'active' && (
              inProgress.length === 0 ? (
                <EmptyState icon="⏳" text="No actions currently executing" />
              ) : (
                inProgress.map(action => (
                  <ActiveActionCard
                    key={action.id}
                    action={action}
                    isExpanded={expandedId === action.id}
                    onToggleExpand={() => setExpandedId(expandedId === action.id ? null : action.id)}
                  />
                ))
              )
            )}

            {/* ── History Tab ─────────────────────────── */}
            {activeTab === 'history' && (
              historyActions.length === 0 ? (
                <EmptyState icon="📋" text="No execution history yet" />
              ) : (
                historyActions.map(action => (
                  <HistoryActionCard
                    key={action.id}
                    action={action}
                    isExpanded={expandedId === action.id}
                    isProcessing={processingId === action.id}
                    isRetrying={isRetrying}
                    onToggleExpand={() => setExpandedId(expandedId === action.id ? null : action.id)}
                    onRetry={action.status === 'failed' ? () => handleRetry(action.id) : undefined}
                  />
                ))
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-Components ────────────────────────────────────────────────────────────

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <span className="text-lg mb-1 opacity-40">{icon}</span>
      <p className="text-[11px] text-muted-foreground">{text}</p>
    </div>
  );
}

interface ActionCardProps {
  action: {
    id: string;
    category: string;
    action_description: string;
    action_type: string;
    risk_level: string;
    status: string;
    policy_result: Record<string, unknown> | null;
    evidence: Record<string, unknown> | null;
    execution_result: Record<string, unknown> | null;
    error_message: string | null;
    retry_count: number;
    max_retries: number;
    dispatched_at: string | null;
    execution_started_at: string | null;
    execution_completed_at: string | null;
    created_at: string;
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function PendingActionCard({
  action, isExpanded, isProcessing, isApproving, isRejecting, onToggleExpand, onApprove, onReject,
}: ActionCardProps & {
  isProcessing: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="rounded-lg p-3 space-y-2 border border-exec-warning/20" style={{ background: 'hsl(36 100% 57% / 0.04)' }}>
      <ActionHeader action={action} />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="default" className="flex-1 min-w-0 h-7 text-[11px] font-semibold" onClick={onApprove} disabled={isApproving || isProcessing}>
          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Approve & Execute</>}
        </Button>
        <Button size="sm" variant="destructive" className="flex-1 min-w-0 h-7 text-[11px] font-semibold" onClick={onReject} disabled={isRejecting || isProcessing}>
          {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3 mr-1" />Reject</>}
        </Button>
      </div>
      <ExpandToggle isExpanded={isExpanded} onToggle={onToggleExpand} />
      {isExpanded && <ActionDetails action={action} />}
    </div>
  );
}

function ActiveActionCard({ action, isExpanded, onToggleExpand }: ActionCardProps) {
  const cfg = STATUS_CONFIG[action.status] || STATUS_CONFIG.created;
  return (
    <div className="rounded-lg p-3 space-y-2 border border-primary/20" style={{ background: 'hsl(var(--primary) / 0.03)' }}>
      <ActionHeader action={action} />
      <div className="flex items-center gap-2 text-[11px]">
        <Badge variant="outline" className={cn('gap-1', cfg.className)}>
          {cfg.icon} {cfg.label}
        </Badge>
        {action.dispatched_at && (
          <span className="text-muted-foreground text-[10px]">
            Dispatched {timeSince(action.dispatched_at)}
          </span>
        )}
      </div>
      {action.status === 'executing' && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      )}
      <ExpandToggle isExpanded={isExpanded} onToggle={onToggleExpand} />
      {isExpanded && <ActionDetails action={action} />}
    </div>
  );
}

function HistoryActionCard({
  action, isExpanded, isProcessing, isRetrying, onToggleExpand, onRetry,
}: ActionCardProps & { isProcessing: boolean; isRetrying: boolean; onRetry?: () => void }) {
  const success = action.status === 'completed';
  return (
    <div className={cn(
      'rounded-lg p-3 space-y-2 border',
      success ? 'border-exec-success/20' : 'border-exec-danger/20'
    )} style={{ background: success ? 'hsl(142 71% 45% / 0.03)' : 'hsl(0 84% 60% / 0.03)' }}>
      <ActionHeader action={action} />
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className={cn('gap-1 text-[10px]', success ? 'badge-success' : 'badge-danger')}>
          {success ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {success ? 'Completed' : action.status === 'rejected' ? 'Rejected' : 'Failed'}
        </Badge>
        {action.execution_completed_at && (
          <span className="text-[10px] text-muted-foreground">{timeSince(action.execution_completed_at)}</span>
        )}
        {onRetry && (
          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={onRetry} disabled={isRetrying || isProcessing}>
            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><RotateCcw className="w-3 h-3" />Retry</>}
          </Button>
        )}
      </div>
      {action.error_message && (
        <p className="text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded font-mono break-words">
          {action.error_message}
        </p>
      )}
      <ExpandToggle isExpanded={isExpanded} onToggle={onToggleExpand} />
      {isExpanded && <ActionDetails action={action} showEvidence />}
    </div>
  );
}

function ActionHeader({ action }: { action: ActionCardProps['action'] }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <span className="shrink-0 text-sm">{CATEGORY_ICONS[action.category] || '⚙️'}</span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium break-words leading-tight line-clamp-2">{action.action_description}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{action.action_type}</p>
        </div>
      </div>
      <RiskBadge level={action.risk_level} />
    </div>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: 'badge-success',
    medium: 'badge-warning',
    high: 'badge-danger',
    critical: 'bg-destructive text-destructive-foreground',
  };
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', colors[level] || 'bg-muted text-muted-foreground')}>
      {level}
    </span>
  );
}

function ExpandToggle({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors pt-1">
      {isExpanded ? <><ChevronUp className="w-3 h-3" />Hide Details</> : <><ChevronDown className="w-3 h-3" />Show Details</>}
    </button>
  );
}

function ActionDetails({ action, showEvidence }: { action: ActionCardProps['action']; showEvidence?: boolean }) {
  return (
    <div className="pt-2 border-t border-border/30 text-[11px] space-y-2 animate-fade-in">
      {/* Policy Result */}
      {action.policy_result && (
        <DetailRow label="Policies">
          {(action.policy_result as { matched_policies?: Array<{ name: string }> })?.matched_policies
            ?.map(p => p.name).join(', ') || 'None matched'}
        </DetailRow>
      )}

      {/* Timing */}
      {action.dispatched_at && (
        <DetailRow label="Dispatched">{new Date(action.dispatched_at).toLocaleString()}</DetailRow>
      )}
      {action.execution_started_at && action.execution_completed_at && (
        <DetailRow label="Duration">
          {Math.round((new Date(action.execution_completed_at).getTime() - new Date(action.execution_started_at).getTime()))}ms
        </DetailRow>
      )}

      {/* Retries */}
      {action.retry_count > 0 && (
        <DetailRow label="Retries">{action.retry_count} / {action.max_retries}</DetailRow>
      )}

      {/* Evidence */}
      {showEvidence && action.evidence && Object.keys(action.evidence).length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-muted-foreground font-semibold">
            <Eye className="w-3 h-3" /> Evidence
          </div>
          <div className="bg-muted/50 rounded p-2 font-mono text-[10px] break-words max-h-32 overflow-y-auto">
            {Object.entries(action.evidence).map(([key, value]) => (
              <div key={key}>
                <span className="text-primary">{key}:</span>{' '}
                <span className="text-foreground/80">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution Result */}
      {action.execution_result && Object.keys(action.execution_result).length > 0 && (
        <div className="space-y-1">
          <span className="text-muted-foreground font-semibold">Output</span>
          <div className="bg-muted/50 rounded p-2 font-mono text-[10px] break-words">
            {JSON.stringify(action.execution_result, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground break-words">
      <span className="font-semibold text-foreground">{label}: </span>{children}
    </p>
  );
}

function timeSince(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
