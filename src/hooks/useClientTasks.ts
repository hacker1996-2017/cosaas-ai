import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientTask {
  id: string;
  organization_id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useClientTasks(clientId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['client_tasks', clientId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('client_tasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ClientTask[];
    },
    enabled: !!user,
  });

  const createTask = useMutation({
    mutationFn: async (task: {
      client_id: string;
      title: string;
      description?: string;
      priority?: string;
      due_date?: string;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user!.id)
        .single();
      if (!profile?.organization_id) throw new Error('No organization found');

      const { data, error } = await (supabase as any)
        .from('client_tasks')
        .insert({
          ...task,
          organization_id: profile.organization_id,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ClientTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_tasks'] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClientTask> }) => {
      const { error } = await (supabase as any)
        .from('client_tasks')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_tasks'] });
    },
  });

  const toggleComplete = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await (supabase as any)
        .from('client_tasks')
        .update({
          status: completed ? 'done' : 'todo',
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('client_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_tasks'] });
    },
  });

  const overdueTasks = (tasks || []).filter(
    (t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()
  );

  return {
    tasks: tasks || [],
    isLoading,
    createTask: createTask.mutateAsync,
    isCreating: createTask.isPending,
    updateTask: updateTask.mutateAsync,
    toggleComplete: toggleComplete.mutateAsync,
    deleteTask: deleteTask.mutateAsync,
    overdueTasks,
    pendingCount: (tasks || []).filter((t) => t.status !== 'done').length,
  };
}
