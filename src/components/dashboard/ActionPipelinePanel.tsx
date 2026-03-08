import { useState } from 'react';
import { Check, X, Loader2, ChevronDown, ChevronUp, Shield, Zap, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useActionPipeline } from '@/hooks/useActionPipeline';
import { toast } from 'sonner';

interface ActionPipelinePanelProps {
  className?: string;
}

export function ActionPipelinePanel({ className }: ActionPipelinePanelProps) {
  const {
    actions, isLoading, approveAction, rejectAction,
    isApproving, isRejecting, stats, pendingApproval,
  } = useActionPipeline();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approveAction({ actionId: id });
      toast.success('Action approved and dispatched');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'approved': case 'dispatched': case 'executing': return 'bg-primary/15 text-primary border border-primary/20';
      case 'pending_approval': return 'badge-warning';
      case 'rejected': case 'failed': case 'cancelled': return 'badge-danger';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'financial': return '💰';
      case 'communication': return '📧';
      case 'data_mutation': return '📝';
      case 'integration': return '🔗';
      case 'scheduling': return '📅';
      case 'reporting': return '📊';
      default: return '⚙️';
    }
  };

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

  const recentActions = actions.filter(a => a.status !== 'pending_approval').slice(0, 5);

  return (
    <div className={cn('panel', className)}>
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
        </div>
      </div>

      <div className="p-3 space-y-2.5">
        {actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Zap className="w-6 h-6 text-muted-foreground mb-2 opacity-40" />
            <p className="text-xs text-muted-foreground">No actions in pipeline</p>
            <p className="text-[10px] text-muted-foreground mt-1 opacity-60">Actions from commands appear here</p>
          </div>
        ) : (
          <>
            {pendingApproval.map((action) => {
              const isExpanded = expandedId === action.id;
              const isProcessing = processingId === action.id;

              return (
                <div key={action.id} className="rounded-lg p-3 space-y-2 border border-exec-warning/20"
                  style={{ background: 'hsl(36 100% 57% / 0.04)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="shrink-0 text-sm">{getCategoryIcon(action.category)}</span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium break-words leading-tight">{action.action_description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{action.action_type}</p>
                      </div>
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', getStatusColor(action.risk_level))}>
                      {action.risk_level}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm" variant="default" className="flex-1 min-w-0 h-auto min-h-7 py-1 text-[10px] leading-tight font-semibold whitespace-normal break-words"
                      onClick={() => handleApprove(action.id)}
                      disabled={isApproving || isProcessing}
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Approve</>}
                    </Button>
                    <Button
                      size="sm" variant="destructive" className="flex-1 h-7 text-[11px] font-semibold"
                      onClick={() => handleReject(action.id)}
                      disabled={isRejecting || isProcessing}
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3 mr-1" />Reject</>}
                    </Button>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : action.id)}
                    className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? <><ChevronUp className="w-3 h-3" />Hide</> : <><ChevronDown className="w-3 h-3" />Details</>}
                  </button>

                  {isExpanded && action.policy_result && (
                    <div className="pt-2 border-t border-border/30 text-[11px] space-y-1 animate-fade-in">
                      <p className="text-muted-foreground break-words">
                        <span className="font-semibold text-foreground">Policies: </span>
                        {(action.policy_result as Record<string, unknown>)?.matched_policies
                          ? ((action.policy_result as Record<string, unknown>).matched_policies as Array<{ name: string }>).map(p => p.name).join(', ')
                          : 'None'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {recentActions.length > 0 && (
              <div className="pt-2 border-t border-border/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent</p>
                {recentActions.map(a => (
                  <div key={a.id} className="flex items-start gap-2 py-1.5 text-[11px]">
                    <span className="shrink-0 text-xs">{getCategoryIcon(a.category)}</span>
                    <span className={cn('px-1.5 py-0.5 rounded-full shrink-0 text-[10px] font-medium', getStatusColor(a.status))}>
                      {a.status.replace('_', ' ')}
                    </span>
                    <span className="break-words min-w-0 text-foreground/80">{a.action_description}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
