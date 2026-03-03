import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type AgentInstruction = Database['public']['Tables']['agent_instructions']['Row'];
type AgentInstructionInsert = Database['public']['Tables']['agent_instructions']['Insert'];

export function useAgentInstructions(agentId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: instructions, isLoading, error } = useQuery({
    queryKey: ['agent_instructions', agentId],
    queryFn: async () => {
      let query = supabase
        .from('agent_instructions')
        .select('*')
        .order('priority', { ascending: false });

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AgentInstruction[];
    },
    enabled: !!user,
  });

  const createInstruction = useMutation({
    mutationFn: async (instruction: Omit<AgentInstructionInsert, 'organization_id'>) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('agent_instructions')
        .insert({ ...instruction, organization_id: profile.organization_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_instructions'] });
    },
  });

  const updateInstruction = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AgentInstruction> }) => {
      const { data, error } = await supabase
        .from('agent_instructions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_instructions'] });
    },
  });

  const deleteInstruction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('agent_instructions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_instructions'] });
    },
  });

  return {
    instructions: instructions || [],
    isLoading,
    error,
    createInstruction: createInstruction.mutateAsync,
    updateInstruction: updateInstruction.mutateAsync,
    deleteInstruction: deleteInstruction.mutateAsync,
    isCreating: createInstruction.isPending,
    isUpdating: updateInstruction.isPending,
  };
}
