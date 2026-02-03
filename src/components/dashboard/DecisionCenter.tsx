import { useState } from 'react';
import { Check, X, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { Decision, DecisionStatus } from '@/types/executive';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Mock decisions
const mockDecisions: Decision[] = [
  {
    id: '1',
    title: 'Increase Marketing Budget',
    status: 'pending',
    confidenceScore: 0.85,
    riskLevel: 'medium',
    agentProposing: 'Sales & Marketing',
    reasoning: 'Based on Q1 performance and lead generation trends, increasing budget by 20% could yield 35% more qualified leads.',
    impactIfApproved: 'Expected +$50K MRR within 3 months',
    impactIfRejected: 'Lead pipeline may stagnate',
    financialImpact: '+$15,000/month',
    deadline: new Date(Date.now() + 86400000),
  },
  {
    id: '2',
    title: 'Renew Client Policy',
    status: 'pending',
    confidenceScore: 0.92,
    riskLevel: 'low',
    agentProposing: 'Finance',
    reasoning: 'Based on payment history (fresh: 1h ago). Risk: Low. Assumptions: No claims. Could go wrong: Fraud.',
    impactIfApproved: 'Client retention secured for 12 months',
    impactIfRejected: 'Client may churn',
    deadline: new Date(Date.now() + 172800000),
  },
  {
    id: '3',
    title: 'Tech Hiring Freeze',
    status: 'approved',
    confidenceScore: 0.88,
    riskLevel: 'medium',
    agentProposing: 'Finance',
    reasoning: 'Current runway optimization needed. Engineering team at capacity.',
    impactIfApproved: 'Save $200K annually',
    impactIfRejected: 'Continue normal hiring',
    deadline: new Date(Date.now() - 86400000),
  },
  {
    id: '4',
    title: 'High-Risk Claim',
    status: 'rejected',
    confidenceScore: 0.75,
    riskLevel: 'high',
    agentProposing: 'Customer Support',
    reasoning: 'Claim exceeds typical range. Documentation incomplete.',
    impactIfApproved: 'Potential loss of $50K',
    impactIfRejected: 'Client may escalate',
    deadline: new Date(Date.now() - 172800000),
  },
];

const statusConfig: Record<DecisionStatus, { label: string; badgeClass: string }> = {
  pending: { label: 'Pending', badgeClass: 'badge-warning' },
  approved: { label: 'Approved', badgeClass: 'badge-success' },
  rejected: { label: 'Rejected', badgeClass: 'badge-danger' },
  modified: { label: 'Modified', badgeClass: 'badge-info' },
};

interface DecisionCenterProps {
  className?: string;
}

export function DecisionCenter({ className }: DecisionCenterProps) {
  const [decisions, setDecisions] = useState(mockDecisions);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    setDecisions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'approved' as DecisionStatus } : d))
    );
  };

  const handleReject = (id: string) => {
    setDecisions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'rejected' as DecisionStatus } : d))
    );
  };

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header">Decision Center</div>
      
      <div className="p-3 space-y-3">
        {decisions.map((decision) => {
          const isExpanded = expandedId === decision.id;
          const isPending = decision.status === 'pending';

          return (
            <div
              key={decision.id}
              className={cn(
                'decision-card',
                decision.riskLevel
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {decision.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    By {decision.agentProposing}
                  </p>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded shrink-0', statusConfig[decision.status].badgeClass)}>
                  {statusConfig[decision.status].label}
                </span>
              </div>

              {/* Confidence Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="text-primary font-medium">
                    {Math.round(decision.confidenceScore * 100)}%
                  </span>
                </div>
                <Progress
                  value={decision.confidenceScore * 100}
                  className="h-1.5"
                />
              </div>

              {/* Actions */}
              {isPending && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 h-8"
                    onClick={() => handleApprove(decision.id)}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 h-8"
                    onClick={() => handleReject(decision.id)}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Reject
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2">
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Expand Toggle */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : decision.id)}
                className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>Hide Details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>Why?</span>
                  </>
                )}
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="pt-3 border-t border-border space-y-2 animate-fade-in">
                  <div>
                    <h5 className="text-xs font-semibold text-foreground">Reasoning</h5>
                    <p className="text-xs text-muted-foreground">{decision.reasoning}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <h5 className="text-xs font-semibold text-exec-success">If Approved</h5>
                      <p className="text-xs text-muted-foreground">{decision.impactIfApproved}</p>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-exec-danger">If Rejected</h5>
                      <p className="text-xs text-muted-foreground">{decision.impactIfRejected}</p>
                    </div>
                  </div>
                  {decision.financialImpact && (
                    <div>
                      <h5 className="text-xs font-semibold text-foreground">Financial Impact</h5>
                      <p className="text-xs text-primary font-medium">{decision.financialImpact}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
