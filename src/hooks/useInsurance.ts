import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';

type InsurancePolicy = Database['public']['Tables']['insurance_policies']['Row'];
type Premium = Database['public']['Tables']['premiums']['Row'];
type Commission = Database['public']['Tables']['commissions']['Row'];
type Insurer = Database['public']['Tables']['insurers']['Row'];

export function useInsurance() {
  const { user } = useAuth();

  const { data: policies, isLoading: policiesLoading } = useQuery({
    queryKey: ['insurance_policies', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as InsurancePolicy[];
    },
    enabled: !!user,
  });

  const { data: premiums, isLoading: premiumsLoading } = useQuery({
    queryKey: ['premiums', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premiums')
        .select('*')
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data as Premium[];
    },
    enabled: !!user,
  });

  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['commissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!user,
  });

  const { data: insurers, isLoading: insurersLoading } = useQuery({
    queryKey: ['insurers', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Insurer[];
    },
    enabled: !!user,
  });

  // Calculate KPIs
  const totalPremiumValue = policies?.reduce((sum, p) => sum + Number(p.premium_amount || 0), 0) || 0;
  const totalCommissions = commissions?.reduce((sum, c) => sum + Number(c.expected_amount || 0), 0) || 0;
  const receivedCommissions = commissions?.reduce((sum, c) => sum + Number(c.received_amount || 0), 0) || 0;
  const premiumsDue = premiums?.filter(p => p.status === 'due').length || 0;
  const premiumsOverdue = premiums?.filter(p => p.status === 'overdue').length || 0;
  const activePolicies = policies?.filter(p => p.status === 'active').length || 0;

  return {
    policies: policies || [],
    premiums: premiums || [],
    commissions: commissions || [],
    insurers: insurers || [],
    isLoading: policiesLoading || premiumsLoading || commissionsLoading || insurersLoading,
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
    },
  };
}
