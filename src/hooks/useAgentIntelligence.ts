import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PerformanceStats {
  totalExecutions: number;
  successRate: number;
  failureRate: number;
  avgDurationMs: number;
  pendingFollowUps: number;
  completedFollowUps: number;
  totalDelegationsInitiated: number;
  totalDelegationsReceived: number;
  recentLessons: Array<{
    lesson: string;
    action_type: string;
    outcome: string;
    at: string;
  }>;
}

interface FollowUp {
  id: string;
  organization_id: string;
  agent_id: string;
  action_pipeline_id: string | null;
  follow_up_type: string;
  description: string;
  due_at: string;
  status: string;
  priority: string;
  completed_at: string | null;
  completion_notes: string | null;
  auto_created: boolean;
  created_at: string;
}

interface Delegation {
  id: string;
  organization_id: string;
  from_agent_id: string;
  to_agent_id: string;
  delegation_type: string;
  task_description: string;
  context: Record<string, unknown>;
  status: string;
  priority: string;
  result: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

interface EvidenceRecord {
  id: string;
  organization_id: string;
  action_pipeline_id: string;
  evidence_type: string;
  evidence_data: Record<string, unknown>;
  verification_status: string;
  confidence_score: number;
  created_at: string;
}

export function useAgentPerformance(agentId?: string) {
  const { user } = useAuth();

  return useQuery<PerformanceStats>({
    queryKey: ['agent_performance', agentId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('agent-intelligence', {
        body: {
          action: 'agent_stats',
          agentId,
          organizationId: (await supabase.from('profiles').select('organization_id').eq('id', user!.id).single()).data?.organization_id,
        },
      });
      if (error) throw new Error(error.message);
      return data as PerformanceStats;
    },
    enabled: !!user && !!agentId,
    staleTime: 30000,
  });
}

export function useAgentFollowUps(agentId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: followUps, isLoading } = useQuery<FollowUp[]>({
    queryKey: ['agent_follow_ups', agentId],
    queryFn: async () => {
      let query = supabase
        .from('agent_follow_ups')
        .select('*')
        .order('due_at', { ascending: true });

      if (agentId) query = query.eq('agent_id', agentId);

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data || []) as unknown as FollowUp[];
    },
    enabled: !!user,
  });

  const completeFollowUp = useMutation({
    mutationFn: async ({ followUpId, notes }: { followUpId: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('agent-intelligence', {
        body: { action: 'complete_follow_up', followUpId, notes },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_follow_ups'] });
      queryClient.invalidateQueries({ queryKey: ['agent_performance'] });
    },
  });

  const pending = followUps?.filter(f => f.status === 'pending') || [];
  const overdue = pending.filter(f => new Date(f.due_at) < new Date());

  return {
    followUps: followUps || [],
    isLoading,
    completeFollowUp: completeFollowUp.mutateAsync,
    isCompleting: completeFollowUp.isPending,
    stats: {
      pending: pending.length,
      overdue: overdue.length,
      completed: followUps?.filter(f => f.status === 'completed').length || 0,
    },
  };
}

export function useAgentDelegations(agentId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: delegations, isLoading } = useQuery<Delegation[]>({
    queryKey: ['agent_delegations', agentId],
    queryFn: async () => {
      let query = supabase
        .from('agent_delegations')
        .select('*')
        .order('created_at', { ascending: false });

      if (agentId) {
        query = query.or(`from_agent_id.eq.${agentId},to_agent_id.eq.${agentId}`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data || []) as unknown as Delegation[];
    },
    enabled: !!user,
  });

  const completeDelegation = useMutation({
    mutationFn: async ({ delegationId, result }: { delegationId: string; result?: Record<string, unknown> }) => {
      const { data, error } = await supabase.functions.invoke('agent-intelligence', {
        body: { action: 'complete_delegation', delegationId, result },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_delegations'] });
      queryClient.invalidateQueries({ queryKey: ['agent_performance'] });
    },
  });

  return {
    delegations: delegations || [],
    isLoading,
    completeDelegation: completeDelegation.mutateAsync,
    stats: {
      pending: delegations?.filter(d => d.status === 'pending').length || 0,
      inProgress: delegations?.filter(d => d.status === 'in_progress').length || 0,
      completed: delegations?.filter(d => d.status === 'completed').length || 0,
    },
  };
}

export function useExecutionEvidence(actionPipelineId?: string) {
  const { user } = useAuth();

  return useQuery<EvidenceRecord[]>({
    queryKey: ['execution_evidence', actionPipelineId],
    queryFn: async () => {
      let query = supabase
        .from('execution_evidence')
        .select('*')
        .order('created_at', { ascending: false });

      if (actionPipelineId) {
        query = query.eq('action_pipeline_id', actionPipelineId);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data || []) as unknown as EvidenceRecord[];
    },
    enabled: !!user,
  });
}
