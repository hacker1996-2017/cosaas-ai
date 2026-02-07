import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';

type Decision = Database['public']['Tables']['decisions']['Row'];

interface ExecuteDecisionResult {
  success: boolean;
  action: 'approved' | 'rejected';
  decisionId: string;
  commandStatus: string;
}

export function useDecisions() {
  const { user, session } = useAuth();
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
        if (old.some(d => d.id === newDecision.id)) return old;
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

  // Execute decision via edge function (handles command updates, timeline, memory)
  const executeDecision = async (
    decisionId: string,
    action: 'approved' | 'rejected',
    notes?: string
  ): Promise<ExecuteDecisionResult> => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('execute-decision', {
      body: { decisionId, action, notes },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to execute decision');
    }

    // Invalidate related queries for fresh data
    queryClient.invalidateQueries({ queryKey: ['commands', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['timeline_events', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['agents', user?.id] });

    return response.data as ExecuteDecisionResult;
  };

  // Legacy local update (fallback)
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

  // Calculate stats
  const pendingCount = decisions?.filter(d => d.status === 'pending').length || 0;
  const approvedCount = decisions?.filter(d => d.status === 'approved').length || 0;
  const rejectedCount = decisions?.filter(d => d.status === 'rejected').length || 0;

  return {
    decisions: decisions || [],
    isLoading,
    error,
    // Primary methods using edge functions
    approveDecision: (id: string, notes?: string) => executeDecision(id, 'approved', notes),
    rejectDecision: (id: string, notes?: string) => executeDecision(id, 'rejected', notes),
    // Legacy fallback
    updateDecisionLocal: updateDecision.mutateAsync,
    isUpdating: updateDecision.isPending,
    stats: {
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      total: decisions?.length || 0,
    },
  };
}
