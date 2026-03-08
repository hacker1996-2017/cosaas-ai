import { useState } from 'react';
import { Bell, Check, CheckCheck, X, AlertTriangle, Zap, Shield, GitBranch, MessageSquare, Bot, CircleAlert, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  action_required: { icon: AlertTriangle, label: 'Action Required', color: 'text-[hsl(var(--accent-warning))]' },
  decision_pending: { icon: CircleAlert, label: 'Decision', color: 'text-[hsl(var(--accent-warning))]' },
  execution_complete: { icon: Check, label: 'Completed', color: 'text-[hsl(var(--accent-success))]' },
  execution_failed: { icon: X, label: 'Failed', color: 'text-[hsl(var(--accent-danger))]' },
  agent_alert: { icon: Bot, label: 'Agent', color: 'text-primary' },
  system: { icon: Zap, label: 'System', color: 'text-muted-foreground' },
  workflow: { icon: GitBranch, label: 'Workflow', color: 'text-primary' },
  communication: { icon: MessageSquare, label: 'Comms', color: 'text-[hsl(var(--accent-info))]' },
  security: { icon: Shield, label: 'Security', color: 'text-[hsl(var(--accent-danger))]' },
  compliance: { icon: Shield, label: 'Compliance', color: 'text-[hsl(var(--accent-warning))]' },
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'border-l-[hsl(var(--accent-danger))] bg-[hsl(var(--accent-danger)/0.05)]',
  high: 'border-l-[hsl(var(--accent-warning))] bg-[hsl(var(--accent-warning)/0.03)]',
  normal: 'border-l-primary/30',
  low: 'border-l-border/30',
};

function NotificationItem({
  notification,
  onRead,
  onDismiss,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const config = CATEGORY_CONFIG[notification.category] || CATEGORY_CONFIG.system;
  const Icon = config.icon;
  const priorityStyle = PRIORITY_STYLES[notification.priority] || PRIORITY_STYLES.normal;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 border-l-2 transition-colors cursor-pointer hover:bg-accent/50 ${priorityStyle} ${
        !notification.is_read ? 'bg-primary/[0.02]' : 'opacity-70'
      }`}
      onClick={() => {
        if (!notification.is_read) onRead(notification.id);
      }}
    >
      <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <p className={`text-xs leading-snug truncate ${!notification.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
          )}
        </div>
        {notification.body && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-border/40">
            {config.label}
          </Badge>
          {notification.priority === 'critical' && (
            <Badge className="text-[9px] h-4 px-1.5 bg-[hsl(var(--accent-danger))] text-white border-0">
              CRITICAL
            </Badge>
          )}
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onDismiss(notification.id); }}
          >
            <X className="w-3 h-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left"><p>Dismiss</p></TooltipContent>
      </Tooltip>
    </div>
  );
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    criticalCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
  } = useNotifications();
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.is_read);
  const read = notifications.filter((n) => n.is_read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-bold px-1 ${
                criticalCount > 0
                  ? 'bg-[hsl(var(--accent-danger))] text-white animate-pulse'
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[400px] p-0 border-border/40"
        align="end"
        sideOffset={8}
        style={{
          background: 'linear-gradient(180deg, hsl(var(--bg-panel)) 0%, hsl(var(--bg-dark)) 100%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => markAllAsRead.mutate()}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Mark all read</p></TooltipContent>
              </Tooltip>
            )}
            {notifications.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => dismissAll.mutate()}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Dismiss all</p></TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Content */}
        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border/20 bg-transparent h-9">
            <TabsTrigger value="unread" className="flex-1 text-xs data-[state=active]:bg-primary/10 rounded-none">
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ''}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1 text-xs data-[state=active]:bg-primary/10 rounded-none">
              All ({notifications.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unread" className="mt-0">
            <ScrollArea className="max-h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : unread.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">All caught up</p>
                  <p className="text-[10px] opacity-60">No unread notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {unread.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={(id) => markAsRead.mutate(id)}
                      onDismiss={(id) => dismiss.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="mt-0">
            <ScrollArea className="max-h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Bell className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={(id) => markAsRead.mutate(id)}
                      onDismiss={(id) => dismiss.mutate(id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
