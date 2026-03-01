import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface AuditLogRow {
  id: string;
  organization_id: string;
  sequence_number: number;
  event_type: string;
  actor_id: string | null;
  actor_type: string;
  resource_type: string;
  resource_id: string | null;
  action: string;
  details: Record<string, unknown>;
  previous_hash: string | null;
  event_hash: string;
  ip_address: string | null;
  created_at: string;
}

export function useAuditLog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const { data: entries, isLoading, error } = useQuery({
    queryKey: ['audit_log', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('sequence_number', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLogRow[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (entries && !realtimeEnabled) {
      setRealtimeEnabled(true);
    }
  }, [entries, realtimeEnabled]);

  useRealtimeSubscription({
    table: 'audit_log',
    enabled: realtimeEnabled && !!user,
    onInsert: (newEntry: Record<string, unknown>) => {
      queryClient.setQueryData<AuditLogRow[]>(['audit_log', user?.id], (old) => {
        const entry = newEntry as unknown as AuditLogRow;
        if (!old) return [entry];
        if (old.some(e => e.id === entry.id)) return old;
        return [entry, ...old];
      });
    },
  });

  return {
    entries: entries || [],
    isLoading,
    error,
    stats: {
      total: entries?.length || 0,
      latestHash: entries?.[0]?.event_hash || 'GENESIS',
      latestSequence: entries?.[0]?.sequence_number || 0,
    },
  };
}
