import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';

type Command = Database['public']['Tables']['commands']['Row'];
type CommandInsert = Database['public']['Tables']['commands']['Insert'];

interface ProcessCommandResult {
  success: boolean;
  parsedIntent?: {
    primaryIntent: string;
    category: string;
    entities: Array<{ type: string; value: string }>;
    suggestedAgents: string[];
    estimatedComplexity: string;
    requiresDecision: boolean;
    clarificationNeeded?: boolean;
  };
  assignedAgent?: { id: string; name: string };
  decision?: { id: string; title: string };
  pipelineAction?: { id: string; status: string };
  status: 'pending_decision' | 'approved' | 'routed' | 'executed' | 'error' | 'awaiting_clarification';
  dispatched?: boolean;
  executionResult?: {
    success: boolean;
    duration_ms?: number;
    evidence?: Record<string, unknown>;
    outputData?: Record<string, unknown>;
  } | null;
  aiResponse?: {
    message: string;
    type: string;
    options?: string[];
    executionSteps?: Array<{ label: string; status: string; detail?: string }>;
  };
}

export function useCommands() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

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

  useEffect(() => {
    if (commands && !realtimeEnabled) {
      setRealtimeEnabled(true);
    }
  }, [commands, realtimeEnabled]);

  useRealtimeSubscription<Command>({
    table: 'commands',
    enabled: realtimeEnabled && !!user,
    onInsert: (newCommand) => {
      queryClient.setQueryData<Command[]>(['commands', user?.id], (old) => {
        if (!old) return [newCommand];
        if (old.some(cmd => cmd.id === newCommand.id)) return old;
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

  const processCommand = async (commandId: string, userResponse?: string): Promise<ProcessCommandResult> => {
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    const response = await supabase.functions.invoke('process-command', {
      body: userResponse ? { commandId, userResponse } : { commandId },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to process command');
    }

    return response.data as ProcessCommandResult;
  };

  const createCommand = useMutation({
    mutationFn: async (commandText: string) => {
      if (!user) throw new Error('User not authenticated');

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

      try {
        const result = await processCommand(data.id);
        return { command: data, aiResult: result };
      } catch (aiError) {
        console.error('AI processing failed:', aiError);
        return { command: data, aiResult: null };
      }
    },
  });

  // Respond to a clarification question
  const respondToCommandMutation = useMutation({
    mutationFn: async ({ commandId, userResponse }: { commandId: string; userResponse: string }) => {
      if (!user) throw new Error('User not authenticated');

      // Optimistically update the command's result to show the user's response
      queryClient.setQueryData<Command[]>(['commands', user?.id], (old) => {
        if (!old) return old;
        return old.map((cmd) => {
          if (cmd.id === commandId) {
            return {
              ...cmd,
              result: {
                ...(cmd.result as Record<string, unknown> || {}),
                awaiting_clarification: false,
                user_clarification: userResponse,
              },
            } as Command;
          }
          return cmd;
        });
      });

      const result = await processCommand(commandId, userResponse);
      return { commandId, aiResult: result };
    },
  });

  const respondToCommand = async (commandId: string, userResponse: string) => {
    return respondToCommandMutation.mutateAsync({ commandId, userResponse });
  };

  const activeCommands = commands?.filter(c => c.status === 'in_progress').length || 0;
  const queuedCommands = commands?.filter(c => c.status === 'queued').length || 0;
  const completedCommands = commands?.filter(c => c.status === 'completed').length || 0;

  return {
    commands: commands || [],
    isLoading,
    error,
    createCommand: createCommand.mutateAsync,
    isCreating: createCommand.isPending,
    respondToCommand,
    isResponding: respondToCommandMutation.isPending,
    processCommand,
    stats: {
      active: activeCommands,
      queued: queuedCommands,
      completed: completedCommands,
      total: commands?.length || 0,
    },
  };
}
