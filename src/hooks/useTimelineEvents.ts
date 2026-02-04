import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';

type TimelineEvent = Database['public']['Tables']['timeline_events']['Row'];

export function useTimelineEvents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const { data: events, isLoading, error } = useQuery({
    queryKey: ['timeline_events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('timeline_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as TimelineEvent[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (events && !realtimeEnabled) {
      setRealtimeEnabled(true);
    }
  }, [events, realtimeEnabled]);

  useRealtimeSubscription<TimelineEvent>({
    table: 'timeline_events',
    enabled: realtimeEnabled && !!user,
    onInsert: (newEvent) => {
      queryClient.setQueryData<TimelineEvent[]>(['timeline_events', user?.id], (old) => {
        if (!old) return [newEvent];
        return [newEvent, ...old];
      });
    },
  });

  return {
    events: events || [],
    isLoading,
    error,
  };
}
