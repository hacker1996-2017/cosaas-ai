import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTimelineEvents } from '@/hooks/useTimelineEvents';
import { Loader2, Clock } from 'lucide-react';

const colorClasses: Record<string, string> = {
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
  const { events, isLoading } = useTimelineEvents();

  if (isLoading) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header">Event Timeline</div>
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>Event Timeline</span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{events.length}</span>
      </div>

      <ScrollArea className="h-64">
        <div className="p-3">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Clock className="w-6 h-6 text-muted-foreground mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground">No events yet</p>
              <p className="text-[10px] text-muted-foreground mt-1 opacity-60">Activity will appear here</p>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="timeline-item">
                <div className={cn('timeline-marker', colorClasses[event.color || 'blue'] || colorClasses.blue)}>
                  {event.icon || '📌'}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {formatTime(new Date(event.created_at))}
                    </span>
                    {event.confidence_score && (
                      <span className="text-[10px] text-primary font-semibold">
                        {Math.round(Number(event.confidence_score) * 100)}%
                      </span>
                    )}
                  </div>
                  <h4 className="text-[13px] font-medium text-foreground leading-tight">{event.title}</h4>
                  {event.description && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{event.description}</p>
                  )}
                  <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/30">
                    {event.event_type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
