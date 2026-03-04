import { useState } from 'react';
import { Check, X, Pencil, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useDecisions } from '@/hooks/useDecisions';
import { toast } from 'sonner';

interface DecisionCenterProps {
  className?: string;
}

export function DecisionCenter({ className }: DecisionCenterProps) {
  const { decisions, isLoading, approveDecision, rejectDecision, isUpdating } = useDecisions();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await approveDecision(id);
      toast.success('Decision approved');
    } catch (error) {
      toast.error('Failed to approve decision');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await rejectDecision(id);
      toast.success('Decision rejected');
    } catch (error) {
      toast.error('Failed to reject decision');
    } finally {
      setProcessingId(null);
    }
  };

  const getRiskBadge = (level: string | null) => {
    switch (level) {
      case 'low': return 'badge-success';
      case 'medium': return 'badge-warning';
      case 'high': case 'critical': return 'badge-danger';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'approved': return 'badge-success';
      case 'rejected': return 'badge-danger';
      case 'modified': return 'bg-primary/20 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Decision Center</div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const pendingDecisions = decisions.filter((d) => d.status === 'pending');
  const otherDecisions = decisions.filter((d) => d.status !== 'pending').slice(0, 3);

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <span>Decision Center</span>
        <span className="text-xs text-muted-foreground">{pendingDecisions.length} pending</span>
      </div>

      <div className="p-3 space-y-3">
        {decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Check className="w-8 h-8 text-[hsl(var(--accent-success))] mb-2" />
            <p className="text-sm text-muted-foreground">No decisions pending</p>
            <p className="text-xs text-muted-foreground mt-1">New decisions will appear here</p>
          </div>
        ) : (
          <>
            {pendingDecisions.map((decision) => {
              const isExpanded = expandedId === decision.id;
              const isProcessing = processingId === decision.id;

              return (
                <div
                  key={decision.id}
                  className={cn('decision-card', decision.risk_level || 'low')}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground break-words">
                        {decision.title}
                      </h4>
                      {decision.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 break-words line-clamp-2">
                          {decision.description}
                        </p>
                      )}
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded shrink-0', getRiskBadge(decision.risk_level))}>
                      {decision.risk_level || 'unknown'}
                    </span>
                  </div>

                  {/* Confidence Bar */}
                  {decision.confidence_score && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="text-primary font-medium">
                          {Math.round(Number(decision.confidence_score) * 100)}%
                        </span>
                      </div>
                      <Progress value={Number(decision.confidence_score) * 100} className="h-1.5" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm" variant="default" className="flex-1 h-8"
                      onClick={() => handleApprove(decision.id)}
                      disabled={isUpdating || isProcessing}
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Approve</>}
                    </Button>
                    <Button
                      size="sm" variant="destructive" className="flex-1 h-8"
                      onClick={() => handleReject(decision.id)}
                      disabled={isUpdating || isProcessing}
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3 mr-1" />Reject</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-2">
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Expand Toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                    className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? <><ChevronUp className="w-3 h-3" /><span>Hide Details</span></> : <><ChevronDown className="w-3 h-3" /><span>Why?</span></>}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-border space-y-2 animate-fade-in">
                      {decision.reasoning && (
                        <div>
                          <h5 className="text-xs font-semibold text-foreground">Reasoning</h5>
                          <p className="text-xs text-muted-foreground break-words">{decision.reasoning}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {decision.impact_if_approved && (
                          <div>
                            <h5 className="text-xs font-semibold text-[hsl(var(--accent-success))]">If Approved</h5>
                            <p className="text-xs text-muted-foreground break-words">{decision.impact_if_approved}</p>
                          </div>
                        )}
                        {decision.impact_if_rejected && (
                          <div>
                            <h5 className="text-xs font-semibold text-destructive">If Rejected</h5>
                            <p className="text-xs text-muted-foreground break-words">{decision.impact_if_rejected}</p>
                          </div>
                        )}
                      </div>
                      {decision.financial_impact && (
                        <div>
                          <h5 className="text-xs font-semibold text-foreground">Financial Impact</h5>
                          <p className="text-xs text-primary font-medium break-words">{decision.financial_impact}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Recent Decisions */}
            {otherDecisions.length > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Recent</p>
                {otherDecisions.map((d) => (
                  <div key={d.id} className="flex items-start gap-2 py-1 text-xs">
                    <span className={cn('px-1.5 py-0.5 rounded shrink-0', getStatusBadge(d.status))}>
                      {d.status}
                    </span>
                    <span className="break-words min-w-0">{d.title}</span>
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
