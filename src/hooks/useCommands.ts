import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';

type Command = Database['public']['Tables']['commands']['Row'];
type CommandInsert = Database['public']['Tables']['commands']['Insert'];

export function useCommands() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // Fetch commands for the current user's organization
  const { data: commands, isLoading, error } = useQuery({
    queryKey: ['commands', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commands')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Command[];
    },
    enabled: !!user,
  });

  // Enable realtime after initial load
  useEffect(() => {
    if (commands && !realtimeEnabled) {
      setRealtimeEnabled(true);
    }
  }, [commands, realtimeEnabled]);

  // Realtime subscription
  useRealtimeSubscription<Command>({
    table: 'commands',
    enabled: realtimeEnabled && !!user,
    onInsert: (newCommand) => {
      queryClient.setQueryData<Command[]>(['commands', user?.id], (old) => {
        if (!old) return [newCommand];
        return [newCommand, ...old];
      });
    },
    onUpdate: (updatedCommand) => {
      queryClient.setQueryData<Command[]>(['commands', user?.id], (old) => {
        if (!old) return [updatedCommand];
        return old.map((cmd) => (cmd.id === updatedCommand.id ? updatedCommand : cmd));
      });
    },
    onDelete: ({ old }) => {
      queryClient.setQueryData<Command[]>(['commands', user?.id], (prev) => {
        if (!prev) return [];
        return prev.filter((cmd) => cmd.id !== old.id);
      });
    },
  });

  // Create command mutation
  const createCommand = useMutation({
    mutationFn: async (commandText: string) => {
      if (!user) throw new Error('User not authenticated');

      // First, get the user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('User not assigned to an organization');
      }

      const newCommand: CommandInsert = {
        organization_id: profile.organization_id,
        user_id: user.id,
        command_text: commandText,
        status: 'queued',
        priority: 5,
      };

      const { data, error } = await supabase
        .from('commands')
        .insert(newCommand)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  return {
    commands: commands || [],
    isLoading,
    error,
    createCommand: createCommand.mutateAsync,
    isCreating: createCommand.isPending,
  };
}
