import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];

export function useClients() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const { data: clients, isLoading, error } = useQuery({
    queryKey: ['clients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (clients && !realtimeEnabled) {
      setRealtimeEnabled(true);
    }
  }, [clients, realtimeEnabled]);

  useRealtimeSubscription<Client>({
    table: 'clients',
    enabled: realtimeEnabled && !!user,
    onInsert: (newClient) => {
      queryClient.setQueryData<Client[]>(['clients', user?.id], (old) => {
        if (!old) return [newClient];
        return [newClient, ...old];
      });
    },
    onUpdate: (updatedClient) => {
      queryClient.setQueryData<Client[]>(['clients', user?.id], (old) => {
        if (!old) return [updatedClient];
        return old.map((c) => (c.id === updatedClient.id ? updatedClient : c));
      });
    },
    onDelete: ({ old }) => {
      queryClient.setQueryData<Client[]>(['clients', user?.id], (prev) => {
        if (!prev) return [];
        return prev.filter((c) => c.id !== old.id);
      });
    },
  });

  const createClient = useMutation({
    mutationFn: async (client: Omit<ClientInsert, 'organization_id'>) => {
      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.organization_id) {
        throw new Error('No organization found');
      }

      const { data, error } = await supabase
        .from('clients')
        .insert({ ...client, organization_id: profile.organization_id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  const updateClient = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Client> }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Calculate stats
  const totalMRR = clients?.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0) || 0;
  const activeClients = clients?.filter((c) => c.status === 'active').length || 0;

  return {
    clients: clients || [],
    isLoading,
    error,
    createClient: createClient.mutateAsync,
    updateClient: updateClient.mutateAsync,
    isCreating: createClient.isPending,
    isUpdating: updateClient.isPending,
    totalMRR,
    activeClients,
    totalClients: clients?.length || 0,
  };
}
