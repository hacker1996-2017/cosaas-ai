import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface ScheduledTask {
  id: string;
  organization_id: string;
  agent_id: string | null;
  created_by: string;
  command_id: string | null;
  name: string;
  description: string | null;
  task_type: string;
  task_config: Record<string, unknown>;
  frequency: string;
  cron_expression: string | null;
  timezone: string;
  scheduled_at: string;
  next_run_at: string | null;
  last_run_at: string | null;
  expires_at: string | null;
  status: string;
  priority: number;
  max_retries: number;
  retry_count: number;
  execution_count: number;
  last_execution_result: Record<string, unknown> | null;
  last_error: string | null;
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

interface ScheduleExecution {
  id: string;
  scheduled_task_id: string;
  organization_id: string;
  agent_id: string | null;
  action_pipeline_id: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
}

export function useScheduledTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // Fetch tasks
  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['scheduled_tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .order('next_run_at', { ascending: true });
      if (error) throw error;
      return data as unknown as ScheduledTask[];
    },
    enabled: !!user,
  });

  // Fetch executions
  const { data: executions } = useQuery({
    queryKey: ['schedule_executions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schedule_executions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as ScheduleExecution[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (tasks && !realtimeEnabled) setRealtimeEnabled(true);
  }, [tasks, realtimeEnabled]);

  useRealtimeSubscription<Record<string, unknown>>({
    table: 'scheduled_tasks' as 'workflows',
    enabled: realtimeEnabled && !!user,
    onInsert: () => queryClient.invalidateQueries({ queryKey: ['scheduled_tasks'] }),
    onUpdate: () => queryClient.invalidateQueries({ queryKey: ['scheduled_tasks'] }),
    onDelete: () => queryClient.invalidateQueries({ queryKey: ['scheduled_tasks'] }),
  });

  // Create task
  const createTask = useMutation({
    mutationFn: async (taskData: Partial<ScheduledTask>) => {
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization');

      const insertData = {
        organization_id: profile.organization_id,
        created_by: user.id,
        name: taskData.name || 'Untitled Task',
        description: taskData.description,
        task_type: taskData.task_type || 'command',
        task_config: taskData.task_config || {},
        frequency: taskData.frequency || 'once' as const,
        cron_expression: taskData.cron_expression,
        timezone: taskData.timezone || 'UTC',
        scheduled_at: taskData.scheduled_at || new Date().toISOString(),
        next_run_at: taskData.next_run_at || taskData.scheduled_at || new Date().toISOString(),
        agent_id: taskData.agent_id,
        priority: taskData.priority || 5,
        max_retries: taskData.max_retries || 3,
        tags: taskData.tags || [],
      };

      const { data, error } = await supabase
        .from('scheduled_tasks')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled_tasks'] }),
  });

  // Pause/Resume/Cancel
  const updateStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'paused') updates.next_run_at = null;
      if (status === 'active') {
        updates.retry_count = 0;
        updates.last_error = null;
      }

      const { error } = await supabase
        .from('scheduled_tasks')
        .update(updates)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled_tasks'] }),
  });

  // Execute now
  const executeNow = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await supabase.functions.invoke('agent-scheduler', {
        body: { action: 'execute_task', taskId },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled_tasks'] });
      queryClient.invalidateQueries({ queryKey: ['schedule_executions'] });
    },
  });

  // Delete task
  const deleteTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('scheduled_tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduled_tasks'] }),
  });

  // Stats
  const activeTasks = tasks?.filter(t => t.status === 'active').length || 0;
  const pausedTasks = tasks?.filter(t => t.status === 'paused').length || 0;
  const failedTasks = tasks?.filter(t => t.status === 'failed').length || 0;
  const totalExecutions = tasks?.reduce((s, t) => s + t.execution_count, 0) || 0;

  const upcomingTasks = (tasks || [])
    .filter(t => t.status === 'active' && t.next_run_at)
    .sort((a, b) => new Date(a.next_run_at!).getTime() - new Date(b.next_run_at!).getTime())
    .slice(0, 10);

  return {
    tasks: tasks || [],
    executions: executions || [],
    isLoading,
    error,
    createTask: createTask.mutateAsync,
    isCreating: createTask.isPending,
    updateStatus: updateStatus.mutateAsync,
    executeNow: executeNow.mutateAsync,
    deleteTask: deleteTask.mutateAsync,
    upcomingTasks,
    stats: { active: activeTasks, paused: pausedTasks, failed: failedTasks, totalExecutions },
  };
}
