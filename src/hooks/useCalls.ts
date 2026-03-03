import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type Call = Database['public']['Tables']['calls']['Row'];
type CallInsert = Database['public']['Tables']['calls']['Insert'];

export function useCalls(clientId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: calls, isLoading, error } = useQuery({
    queryKey: ['calls', user?.id, clientId],
    queryFn: async () => {
      let query = supabase
        .from('calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Call[];
    },
    enabled: !!user,
  });

  const createCall = useMutation({
    mutationFn: async (call: Omit<CallInsert, 'organization_id'>) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('calls')
        .insert({ ...call, organization_id: profile.organization_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
  });

  return {
    calls: calls || [],
    isLoading,
    error,
    createCall: createCall.mutateAsync,
    isCreating: createCall.isPending,
  };
}
