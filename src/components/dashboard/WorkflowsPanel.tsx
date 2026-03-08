import { Workflow, WorkflowStep } from '@/types/executive';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Sparkles, Check, Circle, AlertCircle, Workflow as WorkflowIcon } from 'lucide-react';

const mockWorkflows: Workflow[] = [
  {
    id: '1',
    name: 'Client Onboarding',
    description: 'Standard client onboarding workflow',
    steps: [
      { id: '1', name: 'Claim Intake', status: 'completed', aiAssistAvailable: true },
      { id: '2', name: 'Review & Verify', status: 'in_progress', aiAssistAvailable: true },
      { id: '3', name: 'Payout & Close', status: 'not_started', aiAssistAvailable: true },
    ],
  },
  {
    id: '2',
    name: 'Invoice Processing',
    description: 'Automated invoice handling',
    steps: [
      { id: '1', name: 'Receive Invoice', status: 'completed', aiAssistAvailable: false },
      { id: '2', name: 'Validate Details', status: 'completed', aiAssistAvailable: true },
      { id: '3', name: 'Approve & Pay', status: 'in_progress', aiAssistAvailable: true },
    ],
  },
];

const statusIcons = {
  completed: <Check className="w-3 h-3 text-exec-success" />,
  in_progress: <Circle className="w-3 h-3 text-exec-warning animate-pulse" />,
  not_started: <Circle className="w-3 h-3 text-muted-foreground/40" />,
  failed: <AlertCircle className="w-3 h-3 text-exec-danger" />,
};

const statusBadge = {
  completed: 'badge-success',
  in_progress: 'badge-warning',
  not_started: 'bg-secondary/40 text-muted-foreground border border-border/20',
  failed: 'badge-danger',
};

interface WorkflowsPanelProps {
  className?: string;
}

export function WorkflowsPanel({ className }: WorkflowsPanelProps) {
  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center gap-2">
        <WorkflowIcon className="w-3.5 h-3.5 text-primary" />
        <span>Workflows</span>
      </div>

      <ScrollArea className="h-52">
        <div className="p-3 space-y-4">
          {mockWorkflows.map((workflow) => (
            <div key={workflow.id} className="space-y-2">
              <div>
                <h4 className="text-[13px] font-semibold text-foreground">{workflow.name}</h4>
                <p className="text-[10px] text-muted-foreground">{workflow.description}</p>
              </div>

              <div className="space-y-1">
                {workflow.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/20"
                    style={{ background: 'hsl(var(--bg-soft) / 0.3)' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-background/80 text-[10px] font-semibold font-mono text-muted-foreground border border-border/30">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {statusIcons[step.status]}
                        <span className="text-[11px] text-foreground">{step.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', statusBadge[step.status])}>
                        {step.status.replace('_', ' ')}
                      </span>
                      {step.aiAssistAvailable && step.status !== 'completed' && (
                        <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 border-primary/20 text-primary hover:bg-primary/10">
                          <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                          AI
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-[10px] text-muted-foreground text-center pt-2 opacity-60">
            AI-matched workflows for your industry
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
