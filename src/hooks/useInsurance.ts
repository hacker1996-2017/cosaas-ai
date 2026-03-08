import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from './useOrganization';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type InsurancePolicy = Database['public']['Tables']['insurance_policies']['Row'];
type InsurancePolicyInsert = Database['public']['Tables']['insurance_policies']['Insert'];
type Premium = Database['public']['Tables']['premiums']['Row'];
type PremiumInsert = Database['public']['Tables']['premiums']['Insert'];
type Commission = Database['public']['Tables']['commissions']['Row'];
type CommissionInsert = Database['public']['Tables']['commissions']['Insert'];
type Insurer = Database['public']['Tables']['insurers']['Row'];
type InsurerInsert = Database['public']['Tables']['insurers']['Insert'];
type ReconciliationBatch = Database['public']['Tables']['reconciliation_batches']['Row'];
type ReconciliationException = Database['public']['Tables']['reconciliation_exceptions']['Row'];

export function useInsurance() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: policies, isLoading: policiesLoading } = useQuery({
    queryKey: ['insurance_policies', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as InsurancePolicy[];
    },
    enabled: !!user && !!organizationId,
  });

  const { data: premiums, isLoading: premiumsLoading } = useQuery({
    queryKey: ['premiums', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premiums')
        .select('*')
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data as Premium[];
    },
    enabled: !!user && !!organizationId,
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['commissions', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!user && !!organizationId,
  });

  const { data: insurers, isLoading: insurersLoading } = useQuery({
    queryKey: ['insurers', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Insurer[];
    },
    enabled: !!user && !!organizationId,
  });

  const { data: reconciliationBatches, isLoading: batchesLoading } = useQuery({
    queryKey: ['reconciliation_batches', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliation_batches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReconciliationBatch[];
    },
    enabled: !!user && !!organizationId,
  });

  const { data: reconciliationExceptions, isLoading: exceptionsLoading } = useQuery({
    queryKey: ['reconciliation_exceptions', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reconciliation_exceptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReconciliationException[];
    },
    enabled: !!user && !!organizationId,
  });

  // ── Realtime ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (organizationId && !realtimeEnabled) setRealtimeEnabled(true);
  }, [organizationId, realtimeEnabled]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['insurance_policies'] });
    queryClient.invalidateQueries({ queryKey: ['premiums'] });
    queryClient.invalidateQueries({ queryKey: ['commissions'] });
    queryClient.invalidateQueries({ queryKey: ['insurers'] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation_batches'] });
    queryClient.invalidateQueries({ queryKey: ['reconciliation_exceptions'] });
  };

  useRealtimeSubscription({ table: 'insurance_policies', enabled: realtimeEnabled, onInsert: invalidateAll, onUpdate: invalidateAll, onDelete: invalidateAll });
  useRealtimeSubscription({ table: 'premiums', enabled: realtimeEnabled, onInsert: invalidateAll, onUpdate: invalidateAll, onDelete: invalidateAll });
  useRealtimeSubscription({ table: 'commissions', enabled: realtimeEnabled, onInsert: invalidateAll, onUpdate: invalidateAll, onDelete: invalidateAll });
  useRealtimeSubscription({ table: 'insurers', enabled: realtimeEnabled, onInsert: invalidateAll, onUpdate: invalidateAll, onDelete: invalidateAll });
  useRealtimeSubscription({ table: 'reconciliation_batches', enabled: realtimeEnabled, onInsert: invalidateAll, onUpdate: invalidateAll, onDelete: invalidateAll });

  // ── Insurer CRUD ─────────────────────────────────────────────────────
  const createInsurer = useMutation({
    mutationFn: async (input: Omit<InsurerInsert, 'organization_id'>) => {
      if (!organizationId) throw new Error('No organization');
      const { data, error } = await supabase
        .from('insurers')
        .insert({ ...input, organization_id: organizationId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurers'] }); toast.success('Insurer created'); },
    onError: (e) => toast.error(e.message),
  });

  const updateInsurer = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Insurer>) => {
      const { data, error } = await supabase.from('insurers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurers'] }); toast.success('Insurer updated'); },
    onError: (e) => toast.error(e.message),
  });

  const deleteInsurer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('insurers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurers'] }); toast.success('Insurer deleted'); },
    onError: (e) => toast.error(e.message),
  });

  // ── Policy CRUD ──────────────────────────────────────────────────────
  const createPolicy = useMutation({
    mutationFn: async (input: Omit<InsurancePolicyInsert, 'organization_id'>) => {
      if (!organizationId) throw new Error('No organization');
      const { data, error } = await supabase
        .from('insurance_policies')
        .insert({ ...input, organization_id: organizationId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurance_policies'] }); toast.success('Policy created'); },
    onError: (e) => toast.error(e.message),
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<InsurancePolicy>) => {
      const { data, error } = await supabase.from('insurance_policies').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurance_policies'] }); toast.success('Policy updated'); },
    onError: (e) => toast.error(e.message),
  });

  const deletePolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('insurance_policies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['insurance_policies'] }); toast.success('Policy deleted'); },
    onError: (e) => toast.error(e.message),
  });

  // ── Premium CRUD ─────────────────────────────────────────────────────
  const createPremium = useMutation({
    mutationFn: async (input: Omit<PremiumInsert, 'organization_id'>) => {
      if (!organizationId) throw new Error('No organization');
      const { data, error } = await supabase
        .from('premiums')
        .insert({ ...input, organization_id: organizationId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['premiums'] }); toast.success('Premium recorded'); },
    onError: (e) => toast.error(e.message),
  });

  const updatePremium = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Premium>) => {
      const { data, error } = await supabase.from('premiums').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['premiums'] }); toast.success('Premium updated'); },
    onError: (e) => toast.error(e.message),
  });

  const deletePremium = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('premiums').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['premiums'] }); toast.success('Premium deleted'); },
    onError: (e) => toast.error(e.message),
  });

  // ── Commission CRUD ──────────────────────────────────────────────────
  const createCommission = useMutation({
    mutationFn: async (input: Omit<CommissionInsert, 'organization_id'>) => {
      if (!organizationId) throw new Error('No organization');
      const { data, error } = await supabase
        .from('commissions')
        .insert({ ...input, organization_id: organizationId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commissions'] }); toast.success('Commission recorded'); },
    onError: (e) => toast.error(e.message),
  });

  const updateCommission = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Commission>) => {
      const { data, error } = await supabase.from('commissions').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['commissions'] }); toast.success('Commission updated'); },
    onError: (e) => toast.error(e.message),
  });

  // ── Reconciliation ───────────────────────────────────────────────────
  const runReconciliation = useMutation({
    mutationFn: async (params: { batch_type?: string; insurer_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('reconcile-insurance', {
        body: { ...params, organization_id: organizationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation_batches'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation_exceptions'] });
      toast.success('Reconciliation completed');
    },
    onError: (e) => toast.error(e.message),
  });

  const resolveException = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data, error } = await supabase
        .from('reconciliation_exceptions')
        .update({
          status: 'resolved' as Database['public']['Enums']['reconciliation_status'],
          resolution_notes: notes,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation_exceptions'] });
      toast.success('Exception resolved');
    },
    onError: (e) => toast.error(e.message),
  });

  // ── KPIs ─────────────────────────────────────────────────────────────
  const totalPremiumValue = policies?.reduce((sum, p) => sum + Number(p.premium_amount || 0), 0) || 0;
  const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.expected_amount || 0), 0) || 0;
  const receivedCommissions = commissions?.reduce((sum, c) => sum + Number(c.received_amount || 0), 0) || 0;
  const premiumsDue = premiums?.filter(p => p.status === 'due').length || 0;
  const premiumsOverdue = premiums?.filter(p => p.status === 'overdue').length || 0;
  const activePolicies = policies?.filter(p => p.status === 'active').length || 0;
  const openExceptions = reconciliationExceptions?.filter(e => e.status === 'exception').length || 0;

  return {
    // Data
    policies: policies || [],
    premiums: premiums || [],
    commissions: commissions || [],
    insurers: insurers || [],
    reconciliationBatches: reconciliationBatches || [],
    reconciliationExceptions: reconciliationExceptions || [],
    isLoading: policiesLoading || premiumsLoading || commissionsLoading || insurersLoading || batchesLoading || exceptionsLoading,

    // Insurer CRUD
    createInsurer: createInsurer.mutateAsync,
    updateInsurer: updateInsurer.mutateAsync,
    deleteInsurer: deleteInsurer.mutateAsync,

    // Policy CRUD
    createPolicy: createPolicy.mutateAsync,
    updatePolicy: updatePolicy.mutateAsync,
    deletePolicy: deletePolicy.mutateAsync,

    // Premium CRUD
    createPremium: createPremium.mutateAsync,
    updatePremium: updatePremium.mutateAsync,
    deletePremium: deletePremium.mutateAsync,

    // Commission CRUD
    createCommission: createCommission.mutateAsync,
    updateCommission: updateCommission.mutateAsync,

    // Reconciliation
    runReconciliation: runReconciliation.mutateAsync,
    resolveException: resolveException.mutateAsync,
    isReconciling: runReconciliation.isPending,

    // KPIs
    kpis: {
      totalPremiumValue,
      totalCommissions,
      receivedCommissions,
      pendingCommissions: totalCommissions - receivedCommissions,
      premiumsDue,
      premiumsOverdue,
      activePolicies,
      totalPolicies: policies?.length || 0,
      totalInsurers: insurers?.length || 0,
      openExceptions,
    },
  };
}
