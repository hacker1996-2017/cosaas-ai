import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TableName = 'commands' | 'command_executions' | 'decisions' | 'timeline_events' | 'agents' | 'clients' | 'organizations' | 'profiles' | 'documents' | 'action_pipeline' | 'audit_log' | 'policy_rules' | 'workflows' | 'workflow_steps' | 'emails' | 'messages' | 'notifications';

interface UseRealtimeSubscriptionOptions<T> {
  table: TableName;
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { old: T }) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription<T extends Record<string, unknown>>({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  enabled = true,
}: UseRealtimeSubscriptionOptions<T>) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  const handleChange = useCallback(
    (payload: RealtimePostgresChangesPayload<T>) => {
      switch (payload.eventType) {
        case 'INSERT':
          onInsert?.(payload.new as T);
          break;
        case 'UPDATE':
          onUpdate?.(payload.new as T);
          break;
        case 'DELETE':
          onDelete?.({ old: payload.old as T });
          break;
      }
    },
    [onInsert, onUpdate, onDelete]
  );

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}-${filter || 'all'}-${Date.now()}`;
    
    const channel = supabase.channel(channelName);
    
    const subscription = channel.on(
      'postgres_changes' as const,
      {
        event: '*',
        schema: 'public',
        table,
        ...(filter ? { filter } : {}),
      },
      handleChange as (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => void
    );

    subscription.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Realtime subscribed to ${table}`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filter, enabled, handleChange]);
}
