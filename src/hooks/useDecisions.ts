import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';

type Decision = Database['public']['Tables']['decisions']['Row'];

export function useDecisions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const { data: decisions, isLoading, error } = useQuery({
    queryKey: ['decisions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Decision[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (decisions && !realtimeEnabled) {
      setRealtimeEnabled(true);
    }
  }, [decisions, realtimeEnabled]);

  useRealtimeSubscription<Decision>({
    table: 'decisions',
    enabled: realtimeEnabled && !!user,
    onInsert: (newDecision) => {
      queryClient.setQueryData<Decision[]>(['decisions', user?.id], (old) => {
        if (!old) return [newDecision];
        return [newDecision, ...old];
      });
    },
    onUpdate: (updatedDecision) => {
      queryClient.setQueryData<Decision[]>(['decisions', user?.id], (old) => {
        if (!old) return [updatedDecision];
        return old.map((d) => (d.id === updatedDecision.id ? updatedDecision : d));
      });
    },
  });

  const updateDecision = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes?: string }) => {
      const { data, error } = await supabase
        .from('decisions')
        .update({
          status,
          decision_notes: notes,
          decided_by: user?.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  return {
    decisions: decisions || [],
    isLoading,
    error,
    approveDecision: (id: string, notes?: string) => updateDecision.mutateAsync({ id, status: 'approved', notes }),
    rejectDecision: (id: string, notes?: string) => updateDecision.mutateAsync({ id, status: 'rejected', notes }),
    isUpdating: updateDecision.isPending,
  };
}
