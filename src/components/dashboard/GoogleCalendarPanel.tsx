import { useState } from 'react';
import {
  Calendar, CalendarPlus, RefreshCw, Trash2, ExternalLink,
  Loader2, WifiOff, AlertTriangle, Clock, Users, MapPin,
  CheckCircle2, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useGoogleCalendar, CreateEventInput, GoogleCalendarEvent } from '@/hooks/useGoogleCalendar';

interface GoogleCalendarPanelProps {
  className?: string;
}

function formatEventDate(event: GoogleCalendarEvent): string {
  const rawDate = event.start.dateTime ?? event.start.date;
  if (!rawDate) return '';
  try {
    const date = parseISO(rawDate);
    if (isToday(date)) return `Today ${event.start.dateTime ? format(date, 'h:mm a') : '(all day)'}`;
    if (isTomorrow(date)) return `Tomorrow ${event.start.dateTime ? format(date, 'h:mm a') : '(all day)'}`;
    return format(date, event.start.dateTime ? 'MMM d, h:mm a' : 'MMM d');
  } catch {
    return rawDate;
  }
}

const defaultForm: CreateEventInput = {
  summary: '',
  description: '',
  startDateTime: '',
  endDateTime: '',
  attendeeEmails: [],
  location: '',
};

export function GoogleCalendarPanel({ className }: GoogleCalendarPanelProps) {
  const {
    isConnected, isExpired, checkingConnection, tokenInfo,
    connect, disconnect, events, loadingEvents, eventsError,
    refetchEvents, createEvent, deleteEvent,
  } = useGoogleCalendar();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateEventInput>(defaultForm);
  const [attendeesInput, setAttendeesInput] = useState('');

  const handleCreate = () => {
    if (!form.summary.trim() || !form.startDateTime || !form.endDateTime) return;
    const emails = attendeesInput
      .split(/[,;\n]/)
      .map(e => e.trim())
      .filter(Boolean);
    createEvent.mutate(
      { ...form, attendeeEmails: emails },
      {
        onSuccess: () => {
          setForm(defaultForm);
          setAttendeesInput('');
          setShowCreate(false);
        },
      }
    );
  };

  // ── Not connected ────────────────────────────────────────────────────
  if (checkingConnection) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>Google Calendar</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isConnected || isExpired) {
    return (
      <div className={cn('panel', className)}>
        <div className="panel-header flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>Google Calendar</span>
        </div>

        <div className="p-4 text-center space-y-4">
          <div
            className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.15) 0%, hsl(217 91% 60% / 0.05) 100%)',
              border: '1px solid hsl(217 91% 60% / 0.2)',
            }}
          >
            <Calendar className="w-6 h-6 text-primary" />
          </div>

          {isExpired ? (
            <>
              <div>
                <p className="text-[12px] font-semibold text-exec-warning flex items-center justify-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Session Expired
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Your Google Calendar session has expired. Reconnect to restore access.
                </p>
              </div>
              <Button
                size="sm"
                className="w-full h-8 text-[11px]"
                onClick={connect}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reconnect Google Calendar
              </Button>
            </>
          ) : (
            <>
              <div>
                <p className="text-[13px] font-semibold text-foreground">Connect Google Calendar</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Schedule meetings, read events and send calendar invites — all from your AI command center.
                </p>
              </div>

              <Button
                size="sm"
                className="w-full h-9 text-[12px] font-medium"
                onClick={connect}
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Connect with Google
              </Button>

              <p className="text-[10px] text-muted-foreground">
                You'll be redirected to Google to grant Calendar access. No credentials required.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Connected ────────────────────────────────────────────────────────
  return (
    <div className={cn('panel', className)}>
      {/* Header */}
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span>Google Calendar</span>
          <div className="flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full" style={{ background: 'hsl(152 60% 48% / 0.1)', border: '1px solid hsl(152 60% 48% / 0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-exec-success" style={{ boxShadow: '0 0 4px hsl(152 60% 48% / 0.6)' }} />
            <span className="text-[9px] text-exec-success font-medium">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={() => refetchEvents()}
            disabled={loadingEvents}
          >
            <RefreshCw className={cn('w-3 h-3', loadingEvents && 'animate-spin')} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={() => setShowCreate(v => !v)}
          >
            <CalendarPlus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Account info */}
      <div className="px-3 pt-2">
        <div
          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
          style={{ background: 'hsl(var(--bg-soft) / 0.3)', border: '1px solid hsl(var(--border) / 0.2)' }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-exec-success" />
            <span className="text-[11px] text-foreground font-medium truncate max-w-[160px]">
              {tokenInfo?.email ?? 'Connected'}
            </span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-muted-foreground hover:text-destructive"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            title="Disconnect Google Calendar"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Create Event Form */}
      {showCreate && (
        <div className="px-3 pt-2">
          <div
            className="p-3 rounded-lg border border-primary/20 space-y-2"
            style={{ background: 'hsl(var(--bg-soft) / 0.5)' }}
          >
            <p className="text-[11px] font-semibold text-foreground">New Event</p>

            <input
              value={form.summary}
              onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
              placeholder="Event title *"
              className="w-full px-2.5 py-1.5 rounded-md text-[11px] border border-border/40 bg-background text-foreground focus:border-primary/50 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[9px] text-muted-foreground mb-0.5">Start *</p>
                <input
                  type="datetime-local"
                  value={form.startDateTime}
                  onChange={e => setForm(f => ({ ...f, startDateTime: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-md text-[10px] border border-border/40 bg-background text-foreground focus:border-primary/50 focus:outline-none"
                />
              </div>
              <div>
                <p className="text-[9px] text-muted-foreground mb-0.5">End *</p>
                <input
                  type="datetime-local"
                  value={form.endDateTime}
                  onChange={e => setForm(f => ({ ...f, endDateTime: e.target.value }))}
                  className="w-full px-2 py-1.5 rounded-md text-[10px] border border-border/40 bg-background text-foreground focus:border-primary/50 focus:outline-none"
                />
              </div>
            </div>

            <textarea
              value={attendeesInput}
              onChange={e => setAttendeesInput(e.target.value)}
              placeholder="Invite emails (comma-separated)"
              rows={2}
              className="w-full px-2.5 py-1.5 rounded-md text-[11px] border border-border/40 bg-background text-foreground focus:border-primary/50 focus:outline-none resize-none"
            />

            <input
              value={form.location ?? ''}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Location (optional)"
              className="w-full px-2.5 py-1.5 rounded-md text-[11px] border border-border/40 bg-background text-foreground focus:border-primary/50 focus:outline-none"
            />

            <input
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              className="w-full px-2.5 py-1.5 rounded-md text-[11px] border border-border/40 bg-background text-foreground focus:border-primary/50 focus:outline-none"
            />

            <div className="flex gap-1.5 pt-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-[10px] border-border/30"
                onClick={() => { setShowCreate(false); setForm(defaultForm); setAttendeesInput(''); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 h-7 text-[10px]"
                onClick={handleCreate}
                disabled={!form.summary.trim() || !form.startDateTime || !form.endDateTime || createEvent.isPending}
              >
                {createEvent.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create Event'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="p-3 space-y-1.5">
        {loadingEvents ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          </div>
        ) : eventsError ? (
          <div className="text-center py-5">
            <WifiOff className="w-5 h-5 mx-auto mb-1.5 text-exec-warning" />
            <p className="text-[11px] text-exec-warning">Failed to load events</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {(eventsError as Error).message === 'TOKEN_EXPIRED'
                ? 'Session expired — please reconnect'
                : 'Check your connection and try again'}
            </p>
            <Button size="sm" variant="outline" className="mt-2 h-6 text-[10px]" onClick={() => refetchEvents()}>
              Retry
            </Button>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-5">
            <Calendar className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground/40" />
            <p className="text-[11px] text-muted-foreground">No upcoming events in the next 30 days</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-6 text-[10px]"
              onClick={() => setShowCreate(true)}
            >
              <CalendarPlus className="w-3 h-3 mr-1" />
              Create Event
            </Button>
          </div>
        ) : (
          <>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide px-0.5 pb-0.5">
              Next 30 days · {events.length} event{events.length !== 1 ? 's' : ''}
            </p>
            {events.map(event => (
              <div
                key={event.id}
                className="group flex items-start gap-2.5 p-2 rounded-lg border border-border/20 hover:border-border/40 transition-colors"
                style={{ background: 'hsl(var(--bg-soft) / 0.3)' }}
              >
                {/* Date badge */}
                <div
                  className="flex-shrink-0 w-8 text-center mt-0.5"
                >
                  <p className="text-[9px] font-medium text-muted-foreground uppercase leading-none">
                    {event.start.dateTime
                      ? format(parseISO(event.start.dateTime), 'MMM')
                      : event.start.date
                        ? format(parseISO(event.start.date), 'MMM')
                        : ''}
                  </p>
                  <p className="text-[14px] font-bold text-foreground leading-tight">
                    {event.start.dateTime
                      ? format(parseISO(event.start.dateTime), 'd')
                      : event.start.date
                        ? format(parseISO(event.start.date), 'd')
                        : ''}
                  </p>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{event.summary}</p>

                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      {formatEventDate(event)}
                    </span>
                    {event.attendees && event.attendees.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="w-2.5 h-2.5" />
                        {event.attendees.length}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[100px]">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {event.htmlLink && (
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer">
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </a>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteEvent.mutate(event.id)}
                    disabled={deleteEvent.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
