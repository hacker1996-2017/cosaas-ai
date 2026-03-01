import { useState } from 'react';
import { Check, X, Loader2, ChevronDown, ChevronUp, Shield, Zap } from 'lucide-react';
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
      case 'approved': case 'dispatched': case 'executing': return 'bg-primary/20 text-primary';
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
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const recentActions = actions.filter(a => a.status !== 'pending_approval').slice(0, 5);

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span>Action Pipeline</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {stats.pendingApproval > 0 && (
            <span className="badge-warning px-2 py-0.5 rounded">{stats.pendingApproval} pending</span>
          )}
          {stats.inProgress > 0 && (
            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded">{stats.inProgress} active</span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Zap className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No actions in pipeline</p>
            <p className="text-xs text-muted-foreground mt-1">Actions from commands will appear here</p>
          </div>
        ) : (
          <>
            {/* Pending Approval */}
            {pendingApproval.map((action) => {
              const isExpanded = expandedId === action.id;
              const isProcessing = processingId === action.id;

              return (
                <div key={action.id} className="border border-warning/30 bg-warning/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span>{getCategoryIcon(action.category)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{action.action_description}</p>
                        <p className="text-xs text-muted-foreground">{action.action_type}</p>
                      </div>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded shrink-0', getStatusColor(action.risk_level))}>
                      {action.risk_level}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm" variant="default" className="flex-1 h-7 text-xs"
                      onClick={() => handleApprove(action.id)}
                      disabled={isApproving || isProcessing}
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Approve</>}
                    </Button>
                    <Button
                      size="sm" variant="destructive" className="flex-1 h-7 text-xs"
                      onClick={() => handleReject(action.id)}
                      disabled={isRejecting || isProcessing}
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3 mr-1" />Reject</>}
                    </Button>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : action.id)}
                    className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? <><ChevronUp className="w-3 h-3" />Hide</> : <><ChevronDown className="w-3 h-3" />Details</>}
                  </button>

                  {isExpanded && action.policy_result && (
                    <div className="pt-2 border-t border-border text-xs space-y-1 animate-fade-in">
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Policies matched: </span>
                        {(action.policy_result as Record<string, unknown>)?.matched_policies
                          ? ((action.policy_result as Record<string, unknown>).matched_policies as Array<{ name: string }>).map(p => p.name).join(', ')
                          : 'None'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Recent Actions */}
            {recentActions.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Recent</p>
                {recentActions.map(a => (
                  <div key={a.id} className="flex items-center gap-2 py-1 text-xs">
                    <span>{getCategoryIcon(a.category)}</span>
                    <span className={cn('px-1.5 py-0.5 rounded', getStatusColor(a.status))}>
                      {a.status.replace('_', ' ')}
                    </span>
                    <span className="truncate flex-1">{a.action_description}</span>
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
