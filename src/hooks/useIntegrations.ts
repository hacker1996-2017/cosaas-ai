import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Integration = Database['public']['Tables']['integrations']['Row'];
type IntegrationInsert = Database['public']['Tables']['integrations']['Insert'];
type IntegrationUpdate = Database['public']['Tables']['integrations']['Update'];

export function useIntegrations(organizationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeReady, setRealtimeReady] = useState(false);

  // Fetch user's org id from profile if not provided
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !organizationId,
  });

  const orgId = organizationId || profile?.organization_id;

  // Fetch all integrations
  const {
    data: integrations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['integrations', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRealtimeReady(true);
      return data as Integration[];
    },
    enabled: !!orgId,
  });

  // Realtime subscription
  useRealtimeSubscription<Integration>({
    table: 'integrations',
    filter: orgId ? `organization_id=eq.${orgId}` : undefined,
    enabled: realtimeReady && !!orgId,
    onInsert: () => queryClient.invalidateQueries({ queryKey: ['integrations', orgId] }),
    onUpdate: () => queryClient.invalidateQueries({ queryKey: ['integrations', orgId] }),
    onDelete: () => queryClient.invalidateQueries({ queryKey: ['integrations', orgId] }),
  });

  // Create integration
  const createIntegration = useMutation({
    mutationFn: async (input: {
      serviceName: string;
      serviceType: string;
      config?: Record<string, unknown>;
      webhookUrl?: string;
    }) => {
      const insertData: IntegrationInsert = {
        organization_id: orgId!,
        service_name: input.serviceName,
        service_type: input.serviceType,
        config: (input.config || {}) as any,
        webhook_url: input.webhookUrl || null,
        status: 'disconnected',
        is_active: true,
        sync_errors: 0,
      };

      const { data, error } = await supabase
        .from('integrations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Integration created');
      queryClient.invalidateQueries({ queryKey: ['integrations', orgId] });
    },
    onError: (err) => toast.error(`Failed to create integration: ${err.message}`),
  });

  // Update integration
  const updateIntegration = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: IntegrationUpdate }) => {
      const { data, error } = await supabase
        .from('integrations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Integration updated');
      queryClient.invalidateQueries({ queryKey: ['integrations', orgId] });
    },
    onError: (err) => toast.error(`Failed to update: ${err.message}`),
  });

  // Toggle active state
  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    await updateIntegration.mutateAsync({
      id,
      updates: { is_active: isActive, status: isActive ? 'connected' : 'disconnected' },
    });
  }, [updateIntegration]);

  // Trigger sync
  const triggerSync = useMutation({
    mutationFn: async (integrationId: string) => {
      // Update status to syncing, then simulate sync
      await supabase
        .from('integrations')
        .update({ status: 'syncing' as any, error_message: null })
        .eq('id', integrationId);

      // Call edge function to perform actual sync
      const { data, error } = await supabase.functions.invoke('integration-sync', {
        body: { integrationId, organizationId: orgId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Sync triggered');
      queryClient.invalidateQueries({ queryKey: ['integrations', orgId] });
    },
    onError: (err) => toast.error(`Sync failed: ${err.message}`),
  });

  // Delete integration
  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Integration removed');
      queryClient.invalidateQueries({ queryKey: ['integrations', orgId] });
    },
    onError: (err) => toast.error(`Failed to remove: ${err.message}`),
  });

  // Test connection
  const testConnection = useMutation({
    mutationFn: async (integrationId: string) => {
      const { data, error } = await supabase.functions.invoke('integration-sync', {
        body: { integrationId, organizationId: orgId, action: 'test' },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.healthy) {
        toast.success('Connection healthy');
      } else {
        toast.warning(`Connection issue: ${data?.error || 'Unknown'}`);
      }
    },
    onError: (err) => toast.error(`Test failed: ${err.message}`),
  });

  // Computed stats
  const stats = {
    total: integrations.length,
    active: integrations.filter(i => i.status === 'connected').length,
    errored: integrations.filter(i => i.status === 'error').length,
    totalSyncErrors: integrations.reduce((sum, i) => sum + (i.sync_errors || 0), 0),
  };

  return {
    integrations,
    isLoading,
    error,
    stats,
    refetch,
    createIntegration,
    updateIntegration,
    toggleActive,
    triggerSync,
    deleteIntegration,
    testConnection,
    orgId,
  };
}
