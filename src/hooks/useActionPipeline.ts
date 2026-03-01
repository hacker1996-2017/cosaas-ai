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

  // Approve action
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
    isApproving: approveAction.isPending,
    isRejecting: rejectAction.isPending,
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
