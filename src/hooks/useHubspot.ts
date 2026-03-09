import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface HubspotStatus {
  connected: boolean;
  portalId: string | null;
  hubDomain: string | null;
  hubName: string | null;
  lastSyncAt: string | null;
  contactsSynced: number;
}

export interface HubspotContact {
  id: string;
  properties: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
}

export interface HubspotDeal {
  id: string;
  properties: {
    dealname?: string;
    amount?: string;
    dealstage?: string;
    closedate?: string;
    pipeline?: string;
  };
}

export interface SyncSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
}

export function useHubspot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Connection status ──────────────────────────────────────────────────
  const {
    data: status,
    isLoading: checkingStatus,
    refetch: refetchStatus,
  } = useQuery<HubspotStatus>({
    queryKey: ['hubspot_status', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('hubspot', {
        body: { action: 'status' },
      });
      if (error) throw error;
      return data as HubspotStatus;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const isConnected = status?.connected ?? false;

  // ── Connect with token ─────────────────────────────────────────────────
  const connect = useMutation({
    mutationFn: async (accessToken: string) => {
      const { data, error } = await supabase.functions.invoke('hubspot', {
        body: { action: 'connect', access_token: accessToken },
      });
      if (error) throw error;
      if (data?.code === 'INVALID_TOKEN') throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`🔗 Connected to HubSpot (Portal ${data.portal.portalId})`);
      queryClient.invalidateQueries({ queryKey: ['hubspot_status'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to connect to HubSpot'),
  });

  // ── Disconnect ─────────────────────────────────────────────────────────
  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('hubspot', {
        body: { action: 'disconnect' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('HubSpot disconnected');
      queryClient.invalidateQueries({ queryKey: ['hubspot_status'] });
      queryClient.invalidateQueries({ queryKey: ['hubspot_contacts'] });
      queryClient.invalidateQueries({ queryKey: ['hubspot_deals'] });
    },
    onError: (err: Error) => toast.error(`Failed to disconnect: ${err.message}`),
  });

  // ── Sync contacts ──────────────────────────────────────────────────────
  const syncContacts = useMutation<{ summary: SyncSummary }>({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('hubspot', {
        body: { action: 'sync_contacts' },
      });
      if (error) throw error;
      if (data?.code) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      const s = data.summary;
      toast.success(`✓ Synced ${s.total} contacts (${s.created} new, ${s.updated} updated)`);
      queryClient.invalidateQueries({ queryKey: ['hubspot_status'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (err: Error) => toast.error(`Sync failed: ${err.message}`),
  });

  // ── Push client to HubSpot ─────────────────────────────────────────────
  const pushContact = useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase.functions.invoke('hubspot', {
        body: { action: 'push_contact', clientId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Client pushed to HubSpot');
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (err: Error) => toast.error(`Failed to push: ${err.message}`),
  });

  // ── List deals ─────────────────────────────────────────────────────────
  const {
    data: dealsData,
    isLoading: loadingDeals,
    refetch: refetchDeals,
  } = useQuery<{ results: HubspotDeal[] }>({
    queryKey: ['hubspot_deals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('hubspot', {
        body: { action: 'list_deals', limit: 10 },
      });
      if (error) throw error;
      return data;
    },
    enabled: isConnected,
    staleTime: 60_000,
  });

  return {
    status,
    isConnected,
    checkingStatus,
    refetchStatus,
    connect,
    disconnect,
    syncContacts,
    pushContact,
    deals: dealsData?.results ?? [],
    loadingDeals,
    refetchDeals,
  };
}
