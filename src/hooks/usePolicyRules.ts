import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PolicyRule {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  scope: string;
  category: string;
  condition: Record<string, unknown>;
  action: string;
  risk_level: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export function usePolicyRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: rules, isLoading, error } = useQuery({
    queryKey: ['policy_rules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('policy_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data as PolicyRule[];
    },
    enabled: !!user,
  });

  const toggleRule = useMutation({
    mutationFn: async ({ ruleId, isActive }: { ruleId: string; isActive: boolean }) => {
      const { data, error } = await supabase
        .from('policy_rules')
        .update({ is_active: isActive })
        .eq('id', ruleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy_rules', user?.id] });
    },
  });

  const activeRules = rules?.filter(r => r.is_active) || [];
  const globalRules = rules?.filter(r => r.scope === 'global') || [];
  const industryRules = rules?.filter(r => r.scope === 'industry') || [];

  return {
    rules: rules || [],
    isLoading,
    error,
    toggleRule: toggleRule.mutateAsync,
    isToggling: toggleRule.isPending,
    stats: {
      total: rules?.length || 0,
      active: activeRules.length,
      global: globalRules.length,
      industry: industryRules.length,
    },
  };
}
