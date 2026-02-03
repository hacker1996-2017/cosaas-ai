import { Workflow, WorkflowStep } from '@/types/executive';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Sparkles, Check, Circle, AlertCircle } from 'lucide-react';

// Mock workflows
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
  not_started: <Circle className="w-3 h-3 text-muted-foreground" />,
  failed: <AlertCircle className="w-3 h-3 text-exec-danger" />,
};

const statusBadge = {
  completed: 'badge-success',
  in_progress: 'badge-warning',
  not_started: 'bg-secondary text-muted-foreground',
  failed: 'badge-danger',
};

interface WorkflowsPanelProps {
  className?: string;
}

export function WorkflowsPanel({ className }: WorkflowsPanelProps) {
  return (
    <div className={cn('panel', className)}>
      <div className="panel-header">Workflows with AI Assistance</div>

      <ScrollArea className="h-52">
        <div className="p-3 space-y-4">
          {mockWorkflows.map((workflow) => (
            <div key={workflow.id} className="space-y-2">
              <div>
                <h4 className="text-sm font-medium text-foreground">{workflow.name}</h4>
                <p className="text-xs text-muted-foreground">{workflow.description}</p>
              </div>

              <div className="space-y-1.5">
                {workflow.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-card text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex items-center gap-2">
                        {statusIcons[step.status]}
                        <span className="text-xs text-foreground">{step.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs px-1.5 py-0.5 rounded capitalize', statusBadge[step.status])}>
                        {step.status.replace('_', ' ')}
                      </span>
                      {step.aiAssistAvailable && step.status !== 'completed' && (
                        <Button size="sm" variant="outline" className="h-6 text-xs">
                          <Sparkles className="w-3 h-3 mr-1 text-primary" />
                          AI Assist
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="text-xs text-muted-foreground text-center pt-2">
            Workflows customized for your industry. AI matches steps to client profiles.
          </p>
        </div>
      </ScrollArea>
    </div>
  );
}
