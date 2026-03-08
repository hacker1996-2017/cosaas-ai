import { useState } from 'react';
import { Check, X, Pencil, ChevronDown, ChevronUp, Loader2, Scale } from 'lucide-react';
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
      case 'modified': return 'bg-primary/15 text-primary border border-primary/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Decision Center</div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const pendingDecisions = decisions.filter((d) => d.status === 'pending');
  const otherDecisions = decisions.filter((d) => d.status !== 'pending').slice(0, 3);

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="w-3.5 h-3.5 text-primary" />
          <span>Decision Center</span>
        </div>
        {pendingDecisions.length > 0 && (
          <span className="text-[10px] font-semibold badge-warning px-2 py-0.5 rounded-full">{pendingDecisions.length} pending</span>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        {decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Check className="w-6 h-6 text-exec-success mb-2 opacity-60" />
            <p className="text-xs text-muted-foreground">No decisions pending</p>
            <p className="text-[10px] text-muted-foreground mt-1 opacity-60">New decisions will appear here</p>
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-semibold text-foreground break-words leading-tight">
                        {decision.title}
                      </h4>
                      {decision.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 break-words line-clamp-2 leading-relaxed">
                          {decision.description}
                        </p>
                      )}
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', getRiskBadge(decision.risk_level))}>
                      {decision.risk_level || 'unknown'}
                    </span>
                  </div>

                  {decision.confidence_score && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="text-primary font-semibold font-mono">
                          {Math.round(Number(decision.confidence_score) * 100)}%
                        </span>
                      </div>
                      <Progress value={Number(decision.confidence_score) * 100} className="h-1" />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm" variant="default" className="flex-1 min-w-0 h-auto min-h-7 py-1 text-[10px] leading-tight font-semibold whitespace-normal break-words"
                      onClick={() => handleApprove(decision.id)}
                      disabled={isUpdating || isProcessing}
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Check className="w-3 h-3 mr-1" />Approve</>}
                    </Button>
                    <Button
                      size="sm" variant="destructive" className="flex-1 min-w-0 h-auto min-h-7 py-1 text-[10px] leading-tight font-semibold whitespace-normal break-words"
                      onClick={() => handleReject(decision.id)}
                      disabled={isUpdating || isProcessing}
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><X className="w-3 h-3 mr-1" />Reject</>}
                    </Button>
                    <Button size="sm" variant="outline" className="h-auto min-h-7 px-2 py-1 shrink-0">
                      <Pencil className="w-3 h-3" />
                    </Button>
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                    className="w-full flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isExpanded ? <><ChevronUp className="w-3 h-3" /><span>Hide Details</span></> : <><ChevronDown className="w-3 h-3" /><span>Why?</span></>}
                  </button>

                  {isExpanded && (
                    <div className="pt-3 border-t border-border/30 space-y-2 animate-fade-in">
                      {decision.reasoning && (
                        <div>
                          <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reasoning</h5>
                          <p className="text-[11px] text-foreground/80 break-words leading-relaxed mt-0.5">{decision.reasoning}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        {decision.impact_if_approved && (
                          <div className="stat-card">
                            <h5 className="text-[10px] font-semibold text-exec-success">If Approved</h5>
                            <p className="text-[10px] text-muted-foreground break-words mt-0.5">{decision.impact_if_approved}</p>
                          </div>
                        )}
                        {decision.impact_if_rejected && (
                          <div className="stat-card">
                            <h5 className="text-[10px] font-semibold text-destructive">If Rejected</h5>
                            <p className="text-[10px] text-muted-foreground break-words mt-0.5">{decision.impact_if_rejected}</p>
                          </div>
                        )}
                      </div>
                      {decision.financial_impact && (
                        <div>
                          <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Financial Impact</h5>
                          <p className="text-sm text-primary font-semibold break-words mt-0.5 font-mono">{decision.financial_impact}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {otherDecisions.length > 0 && (
              <div className="pt-2 border-t border-border/30">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recent</p>
                {otherDecisions.map((d) => (
                  <div key={d.id} className="flex items-start gap-2 py-1.5 text-[11px]">
                    <span className={cn('px-1.5 py-0.5 rounded-full shrink-0 text-[10px] font-medium', getStatusBadge(d.status))}>
                      {d.status}
                    </span>
                    <span className="break-words min-w-0 text-foreground/80">{d.title}</span>
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
