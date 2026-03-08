import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';

type Workflow = Database['public']['Tables']['workflows']['Row'];
type WorkflowInsert = Database['public']['Tables']['workflows']['Insert'];
type WorkflowStep = Database['public']['Tables']['workflow_steps']['Row'];
type WorkflowStepInsert = Database['public']['Tables']['workflow_steps']['Insert'];

export interface WorkflowWithSteps extends Workflow {
  workflow_steps: WorkflowStep[];
}

export function useWorkflows() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // Fetch workflows with steps
  const { data: workflows, isLoading, error } = useQuery({
    queryKey: ['workflows', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('*, workflow_steps(*)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Sort steps within each workflow
      return (data as WorkflowWithSteps[]).map(wf => ({
        ...wf,
        workflow_steps: (wf.workflow_steps || []).sort((a, b) => a.step_number - b.step_number),
      }));
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (workflows && !realtimeEnabled) setRealtimeEnabled(true);
  }, [workflows, realtimeEnabled]);

  // Realtime for workflows
  useRealtimeSubscription({
    table: 'workflows',
    enabled: realtimeEnabled && !!user,
    onInsert: () => queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] }),
    onUpdate: () => queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] }),
  });

  // Realtime for steps
  useRealtimeSubscription({
    table: 'workflow_steps',
    enabled: realtimeEnabled && !!user,
    onInsert: () => queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] }),
    onUpdate: () => queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] }),
  });

  // Create workflow
  const createWorkflow = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      trigger_type?: string;
      trigger_config?: Record<string, unknown>;
      steps: Array<{
        name: string;
        description?: string;
        action_type: string;
        action_config?: Record<string, unknown>;
        agent_id?: string;
      }>;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      // Create workflow
      const { data: workflow, error: wfError } = await supabase
        .from('workflows')
        .insert({
          organization_id: profile.organization_id,
          created_by: user!.id,
          name: data.name,
          description: data.description || null,
          trigger_type: data.trigger_type || 'manual',
          trigger_config: data.trigger_config || {},
          is_active: true,
        } as WorkflowInsert)
        .select()
        .single();

      if (wfError || !workflow) throw new Error(wfError?.message || 'Failed to create workflow');

      // Create steps
      if (data.steps.length > 0) {
        const stepsToInsert = data.steps.map((step, index) => ({
          workflow_id: workflow.id,
          name: step.name,
          description: step.description || null,
          action_type: step.action_type,
          action_config: (step.action_config || {}) as Database['public']['Tables']['workflow_steps']['Insert']['action_config'],
          step_number: index + 1,
          agent_id: step.agent_id || null,
          ai_assist_available: true,
        }));

        const { error: stepsError } = await supabase
          .from('workflow_steps')
          .insert(stepsToInsert);

        if (stepsError) throw new Error(`Workflow created but steps failed: ${stepsError.message}`);
      }

      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
    },
  });

  // Update workflow
  const updateWorkflow = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Workflow> & { id: string }) => {
      const { data, error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
    },
  });

  // Delete workflow
  const deleteWorkflow = useMutation({
    mutationFn: async (id: string) => {
      // Delete steps first
      await supabase.from('workflow_steps').delete().eq('workflow_id', id);
      const { error } = await supabase.from('workflows').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
    },
  });

  // Add step to workflow
  const addStep = useMutation({
    mutationFn: async (step: WorkflowStepInsert) => {
      const { data, error } = await supabase
        .from('workflow_steps')
        .insert(step)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
    },
  });

  // Update step
  const updateStep = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WorkflowStep> & { id: string }) => {
      const { data, error } = await supabase
        .from('workflow_steps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
    },
  });

  // Delete step
  const deleteStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workflow_steps').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
    },
  });

  // Execute workflow
  const executeWorkflow = useMutation({
    mutationFn: async (workflowId: string) => {
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: { action: 'execute', workflowId },
      });
      if (error) throw new Error(error.message || 'Workflow execution failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['action_pipeline', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['commands', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['timeline_events', user?.id] });
    },
  });

  // Execute single step
  const executeStep = useMutation({
    mutationFn: async (stepId: string) => {
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: { action: 'execute_step', stepId },
      });
      if (error) throw new Error(error.message || 'Step execution failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['action_pipeline', user?.id] });
    },
  });

  // AI Generate workflow from natural language
  const generateWorkflow = useMutation({
    mutationFn: async (prompt: string) => {
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: { action: 'generate', prompt },
      });
      if (error) throw new Error(error.message || 'Workflow generation failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['audit_log', user?.id] });
    },
  });

  // Stats
  const activeWorkflows = workflows?.filter(w => w.is_active) || [];
  const totalExecutions = workflows?.reduce((sum, w) => sum + (w.execution_count || 0), 0) || 0;

  return {
    workflows: workflows || [],
    isLoading,
    error,
    createWorkflow: createWorkflow.mutateAsync,
    updateWorkflow: updateWorkflow.mutateAsync,
    deleteWorkflow: deleteWorkflow.mutateAsync,
    addStep: addStep.mutateAsync,
    updateStep: updateStep.mutateAsync,
    deleteStep: deleteStep.mutateAsync,
    executeWorkflow: executeWorkflow.mutateAsync,
    executeStep: executeStep.mutateAsync,
    generateWorkflow: generateWorkflow.mutateAsync,
    isCreating: createWorkflow.isPending,
    isExecuting: executeWorkflow.isPending,
    isExecutingStep: executeStep.isPending,
    isGenerating: generateWorkflow.isPending,
    stats: {
      total: workflows?.length || 0,
      active: activeWorkflows.length,
      totalExecutions,
    },
  };
}
