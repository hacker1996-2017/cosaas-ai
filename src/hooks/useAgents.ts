import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';

type Agent = Database['public']['Tables']['agents']['Row'];

export function useAgents() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const { data: agents, isLoading, error } = useQuery({
    queryKey: ['agents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Agent[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (agents && !realtimeEnabled) {
      setRealtimeEnabled(true);
    }
  }, [agents, realtimeEnabled]);

  useRealtimeSubscription<Agent>({
    table: 'agents',
    enabled: realtimeEnabled && !!user,
    onUpdate: (updatedAgent) => {
      queryClient.setQueryData<Agent[]>(['agents', user?.id], (old) => {
        if (!old) return [updatedAgent];
        return old.map((a) => (a.id === updatedAgent.id ? updatedAgent : a));
      });
    },
  });

  return {
    agents: agents || [],
    isLoading,
    error,
  };
}
