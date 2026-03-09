import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  status?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  organizer?: { email: string; displayName?: string };
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeEmails?: string[];
  location?: string;
  timeZone?: string;
}

export interface GoogleCalendarTokenInfo {
  id: string;
  email: string | null;
  expires_at: string | null;
  created_at: string;
}

export function useGoogleCalendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Handle OAuth callback ──────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_calendar') !== 'connected') return;
    if (!user) return;

    // Clean up the URL immediately so the param doesn't trigger again
    window.history.replaceState({}, '', window.location.pathname);

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.provider_token) {
        toast.error('Could not get Google access token. Please try connecting again.');
        return;
      }

      // Fetch the Google account email
      let googleEmail: string = user.email ?? '';
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
          headers: { Authorization: `Bearer ${session.provider_token}` },
        });
        if (infoRes.ok) {
          const info = await infoRes.json();
          googleEmail = info.email ?? googleEmail;
        }
      } catch (_) {
        // non-fatal
      }

      // Fetch the user's org ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      // Upsert token record (1 hour default expiry for Google access tokens)
      const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

      const { error } = await (supabase as any)
        .from('google_calendar_tokens')
        .upsert(
          {
            user_id: user.id,
            organization_id: profile?.organization_id ?? '',
            access_token: session.provider_token,
            refresh_token: session.provider_refresh_token ?? null,
            expires_at: expiresAt,
            email: googleEmail,
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error('Failed to save Google Calendar token:', error);
        toast.error('Failed to save Google Calendar connection.');
      } else {
        toast.success('🗓️ Google Calendar connected!');
        queryClient.invalidateQueries({ queryKey: ['google_calendar_token', user.id] });
      }
    })();
  }, [user]); // re-runs when user becomes available after OAuth redirect

  // ── Connection status ──────────────────────────────────────────────────
  const { data: tokenInfo, isLoading: checkingConnection } = useQuery<GoogleCalendarTokenInfo | null>({
    queryKey: ['google_calendar_token', user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('google_calendar_tokens')
        .select('id, email, expires_at, created_at')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!user,
  });

  const isConnected = !!tokenInfo;
  const isExpired = tokenInfo?.expires_at
    ? new Date(tokenInfo.expires_at) < new Date()
    : false;

  // ── Connect ────────────────────────────────────────────────────────────
  const connect = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: [
          'openid',
          'profile',
          'email',
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/calendar.readonly',
        ].join(' '),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        redirectTo: `${window.location.origin}/?google_calendar=connected`,
      },
    });
    if (error) toast.error(error.message);
  }, []);

  // ── Disconnect ─────────────────────────────────────────────────────────
  const disconnect = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Google Calendar disconnected');
      queryClient.invalidateQueries({ queryKey: ['google_calendar_token', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['google_calendar_events', user?.id] });
    },
    onError: (err: Error) => toast.error(`Failed to disconnect: ${err.message}`),
  });

  // ── List Events ────────────────────────────────────────────────────────
  const {
    data: events,
    isLoading: loadingEvents,
    error: eventsError,
    refetch: refetchEvents,
  } = useQuery<GoogleCalendarEvent[]>({
    queryKey: ['google_calendar_events', user?.id],
    queryFn: async () => {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: {
          action: 'list_events',
          timeMin: now.toISOString(),
          timeMax: in30Days.toISOString(),
          maxResults: 25,
        },
      });
      if (error) throw error;
      if (data?.code) throw new Error(data.code);
      return (data?.items as GoogleCalendarEvent[]) ?? [];
    },
    enabled: isConnected && !isExpired,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // ── Create Event ───────────────────────────────────────────────────────
  const createEvent = useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const tz = input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
      const event = {
        summary: input.summary,
        description: input.description ?? undefined,
        location: input.location ?? undefined,
        start: { dateTime: input.startDateTime, timeZone: tz },
        end: { dateTime: input.endDateTime, timeZone: tz },
        attendees: input.attendeeEmails?.map(email => ({ email })),
      };
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'create_event', event },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as GoogleCalendarEvent;
    },
    onSuccess: (ev) => {
      toast.success(`Event "${ev.summary}" added to Google Calendar`);
      queryClient.invalidateQueries({ queryKey: ['google_calendar_events', user?.id] });
    },
    onError: (err: Error) => toast.error(`Failed to create event: ${err.message}`),
  });

  // ── Delete Event ───────────────────────────────────────────────────────
  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await supabase.functions.invoke('google-calendar', {
        body: { action: 'delete_event', eventId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Event removed from Google Calendar');
      queryClient.invalidateQueries({ queryKey: ['google_calendar_events', user?.id] });
    },
    onError: (err: Error) => toast.error(`Failed to delete event: ${err.message}`),
  });

  return {
    isConnected,
    isExpired,
    checkingConnection,
    tokenInfo,
    connect,
    disconnect,
    events: events ?? [],
    loadingEvents,
    eventsError,
    refetchEvents,
    createEvent,
    deleteEvent,
  };
}
