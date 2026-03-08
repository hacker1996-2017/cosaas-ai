import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface ActionPipelineRow {
  id: string;
  organization_id: string;
  command_id: string | null;
  agent_id: string | null;
  created_by: string;
  category: string;
  action_type: string;
  action_description: string;
  action_params: Record<string, unknown>;
  status: string;
  policy_result: Record<string, unknown> | null;
  policy_evaluated_at: string | null;
  requires_approval: boolean;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  dispatched_at: string | null;
  execution_started_at: string | null;
  execution_completed_at: string | null;
  execution_result: Record<string, unknown> | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  evidence: Record<string, unknown> | null;
  risk_level: string;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export function useActionPipeline() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const { data: actions, isLoading, error } = useQuery({
    queryKey: ['action_pipeline', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_pipeline')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ActionPipelineRow[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (actions && !realtimeEnabled) {
      setRealtimeEnabled(true);
    }
  }, [actions, realtimeEnabled]);

  useRealtimeSubscription({
    table: 'action_pipeline',
    enabled: realtimeEnabled && !!user,
    onInsert: (newAction: Record<string, unknown>) => {
      queryClient.setQueryData<ActionPipelineRow[]>(['action_pipeline', user?.id], (old) => {
        const action = newAction as unknown as ActionPipelineRow;
        if (!old) return [action];
        if (old.some(a => a.id === action.id)) return old;
        return [action, ...old];
      });
    },
    onUpdate: (updated: Record<string, unknown>) => {
      queryClient.setQueryData<ActionPipelineRow[]>(['action_pipeline', user?.id], (old) => {
        const action = updated as unknown as ActionPipelineRow;
        if (!old) return [action];
        return old.map(a => a.id === action.id ? action : a);
      });
    },
  });

  // Dispatch an approved action to the execution engine
  const dispatchAction = useMutation({
    mutationFn: async (actionId: string) => {
      const { data, error } = await supabase.functions.invoke('dispatch-action', {
        body: { actionId },
      });
      if (error) throw new Error(error.message || 'Dispatch failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action_pipeline', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['commands', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['timeline_events', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['agents', user?.id] });
    },
  });

  // Approve action → then auto-dispatch
  const approveAction = useMutation({
    mutationFn: async ({ actionId, notes }: { actionId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('action_pipeline')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          approval_notes: notes || null,
        })
        .eq('id', actionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Auto-dispatch after approval
      try {
        await dispatchAction.mutateAsync(data.id);
      } catch (err) {
        console.error('Auto-dispatch failed:', err);
        // Action is still approved — can be retried manually
      }
    },
  });

  // Reject action
  const rejectAction = useMutation({
    mutationFn: async ({ actionId, notes }: { actionId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('action_pipeline')
        .update({
          status: 'rejected',
          approval_notes: notes || null,
        })
        .eq('id', actionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Manual retry for failed actions
  const retryAction = useMutation({
    mutationFn: async (actionId: string) => {
      // Reset to approved so dispatcher picks it up
      const { error } = await supabase
        .from('action_pipeline')
        .update({
          status: 'approved',
          error_message: null,
          execution_started_at: null,
          execution_completed_at: null,
          execution_result: null,
          dispatched_at: null,
        })
        .eq('id', actionId);

      if (error) throw error;

      // Then dispatch
      return dispatchAction.mutateAsync(actionId);
    },
  });

  const pendingApproval = actions?.filter(a => a.status === 'pending_approval') || [];
  const inProgress = actions?.filter(a => ['created', 'policy_evaluating', 'dispatched', 'executing'].includes(a.status)) || [];
  const completed = actions?.filter(a => a.status === 'completed') || [];
  const failed = actions?.filter(a => ['failed', 'rejected', 'cancelled'].includes(a.status)) || [];

  return {
    actions: actions || [],
    isLoading,
    error,
    approveAction: approveAction.mutateAsync,
    rejectAction: rejectAction.mutateAsync,
    dispatchAction: dispatchAction.mutateAsync,
    retryAction: retryAction.mutateAsync,
    isApproving: approveAction.isPending,
    isRejecting: rejectAction.isPending,
    isDispatching: dispatchAction.isPending,
    isRetrying: retryAction.isPending,
    stats: {
      pendingApproval: pendingApproval.length,
      inProgress: inProgress.length,
      completed: completed.length,
      failed: failed.length,
      total: actions?.length || 0,
    },
    pendingApproval,
    inProgress,
    completed,
    failed,
  };
}
