import { TimelineEvent, EventType } from '@/types/executive';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Mock timeline events
const mockEvents: TimelineEvent[] = [
  {
    id: '1',
    type: 'ai_action',
    timestamp: new Date(Date.now() - 300000),
    title: 'Reconciled payments',
    description: 'Finance Agent processed 23 pending transactions',
    agentInvolved: 'Finance',
    icon: '💰',
    color: 'blue',
    confidenceScore: 0.95,
  },
  {
    id: '2',
    type: 'human_decision',
    timestamp: new Date(Date.now() - 900000),
    title: 'Approved budget',
    description: 'Marketing budget increased by 20%',
    icon: '✅',
    color: 'green',
  },
  {
    id: '3',
    type: 'kpi_milestone',
    timestamp: new Date(Date.now() - 1800000),
    title: 'Revenue up 5%',
    description: 'Monthly target exceeded',
    icon: '📈',
    color: 'green',
  },
  {
    id: '4',
    type: 'external_event',
    timestamp: new Date(Date.now() - 3600000),
    title: 'Market alert',
    description: 'Competitor launched new product',
    icon: '⚠️',
    color: 'orange',
  },
  {
    id: '5',
    type: 'ai_action',
    timestamp: new Date(Date.now() - 7200000),
    title: 'Client onboarded',
    description: 'Acme Corp successfully onboarded',
    agentInvolved: 'Chief of Staff',
    icon: '🎉',
    color: 'green',
    confidenceScore: 0.98,
  },
];

const colorClasses = {
  green: 'bg-exec-success text-white',
  blue: 'bg-primary text-white',
  orange: 'bg-exec-warning text-white',
  red: 'bg-exec-danger text-white',
};

function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

interface EventTimelineProps {
  className?: string;
}

export function EventTimeline({ className }: EventTimelineProps) {
  return (
    <div className={cn('panel', className)}>
      <div className="panel-header">Event Timeline</div>
      
      <ScrollArea className="h-64">
        <div className="p-3">
          {mockEvents.map((event) => (
            <div key={event.id} className="timeline-item">
              {/* Marker */}
              <div className={cn('timeline-marker', colorClasses[event.color])}>
                {event.icon}
              </div>

              {/* Content */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(event.timestamp)}
                  </span>
                  {event.confidenceScore && (
                    <span className="text-xs text-primary">
                      {Math.round(event.confidenceScore * 100)}%
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-medium text-foreground">{event.title}</h4>
                <p className="text-xs text-muted-foreground">{event.description}</p>
                {event.agentInvolved && (
                  <span className="text-xs text-primary/80">By {event.agentInvolved}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
