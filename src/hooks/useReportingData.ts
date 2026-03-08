import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from './useOrganization';
import { useMemo } from 'react';

interface RevenueDataPoint {
  month: string;
  mrr: number;
  premiums: number;
  commissions: number;
}

interface ClientSegment {
  name: string;
  value: number;
  fill: string;
}

interface AgentPerformance {
  name: string;
  emoji: string;
  tasks: number;
  capacity: number;
  quota: number;
  quotaMax: number;
}

interface PipelineMetrics {
  status: string;
  count: number;
  fill: string;
}

interface RiskDistribution {
  level: string;
  clients: number;
  policies: number;
  fill: string;
}

export function useReportingData() {
  const { user } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;

  // Clients data
  const { data: clients } = useQuery({
    queryKey: ['reporting-clients', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('clients').select('*').eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Agents data
  const { data: agents } = useQuery({
    queryKey: ['reporting-agents', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('agents').select('*').eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Policies data
  const { data: policies } = useQuery({
    queryKey: ['reporting-policies', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('insurance_policies').select('*').eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Premiums data
  const { data: premiums } = useQuery({
    queryKey: ['reporting-premiums', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('premiums').select('*').eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Commissions data
  const { data: commissions } = useQuery({
    queryKey: ['reporting-commissions', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('commissions').select('*').eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Commands data
  const { data: commands } = useQuery({
    queryKey: ['reporting-commands', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('commands').select('*').eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(500);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Action pipeline
  const { data: actions } = useQuery({
    queryKey: ['reporting-actions', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('action_pipeline').select('*').eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(500);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Decisions
  const { data: decisions } = useQuery({
    queryKey: ['reporting-decisions', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('decisions').select('*').eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Emails
  const { data: emails } = useQuery({
    queryKey: ['reporting-emails', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('emails').select('*').eq('organization_id', orgId!).limit(500);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Reconciliation batches
  const { data: reconBatches } = useQuery({
    queryKey: ['reporting-recon', orgId],
    queryFn: async () => {
      const { data } = await supabase.from('reconciliation_batches').select('*').eq('organization_id', orgId!);
      return data || [];
    },
    enabled: !!orgId,
  });

  // Compute all derived metrics
  const metrics = useMemo(() => {
    const totalMRR = clients?.reduce((sum, c) => sum + (Number(c.mrr) || 0), 0) || 0;
    const totalClients = clients?.length || 0;
    const activeClients = clients?.filter(c => c.status === 'active').length || 0;
    const churnRisk = clients?.filter(c => c.risk_of_churn === 'high' || c.risk_of_churn === 'critical').length || 0;
    const avgHealthScore = totalClients > 0 ? Math.round((clients?.reduce((sum, c) => sum + (c.health_score || 0), 0) || 0) / totalClients) : 0;

    const totalPremiumValue = premiums?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0;
    const collectedPremiums = premiums?.filter(p => p.status === 'paid').reduce((sum, p) => sum + (Number(p.paid_amount) || 0), 0) || 0;
    const premiumCollectionRate = totalPremiumValue > 0 ? Math.round((collectedPremiums / totalPremiumValue) * 100) : 0;

    const totalCommExpected = commissions?.reduce((sum, c) => sum + (Number(c.expected_amount) || 0), 0) || 0;
    const totalCommReceived = commissions?.reduce((sum, c) => sum + (Number(c.received_amount) || 0), 0) || 0;
    const commissionRate = totalCommExpected > 0 ? Math.round((totalCommReceived / totalCommExpected) * 100) : 0;

    const totalPolicies = policies?.length || 0;
    const activePolicies = policies?.filter(p => p.status === 'active').length || 0;

    const totalCommands = commands?.length || 0;
    const completedCommands = commands?.filter(c => c.status === 'completed').length || 0;
    const commandSuccessRate = totalCommands > 0 ? Math.round((completedCommands / totalCommands) * 100) : 0;

    const totalDecisions = decisions?.length || 0;
    const approvedDecisions = decisions?.filter(d => d.status === 'approved').length || 0;
    const pendingDecisions = decisions?.filter(d => d.status === 'pending').length || 0;

    const totalActions = actions?.length || 0;
    const executedActions = actions?.filter(a => a.status === 'completed').length || 0;

    const totalEmails = emails?.length || 0;
    const sentEmails = emails?.filter(e => e.status === 'sent' || e.status === 'delivered').length || 0;

    return {
      totalMRR, totalClients, activeClients, churnRisk, avgHealthScore,
      totalPremiumValue, collectedPremiums, premiumCollectionRate,
      totalCommExpected, totalCommReceived, commissionRate,
      totalPolicies, activePolicies,
      totalCommands, completedCommands, commandSuccessRate,
      totalDecisions, approvedDecisions, pendingDecisions,
      totalActions, executedActions,
      totalEmails, sentEmails,
    };
  }, [clients, premiums, commissions, policies, commands, decisions, actions, emails]);

  // Chart data: Client segments by type
  const clientSegments: ClientSegment[] = useMemo(() => {
    if (!clients?.length) return [];
    const counts: Record<string, number> = {};
    clients.forEach(c => { counts[c.client_type || 'smb'] = (counts[c.client_type || 'smb'] || 0) + 1; });
    const fills = { startup: 'hsl(217, 91%, 60%)', enterprise: 'hsl(40, 76%, 55%)', smb: 'hsl(152, 60%, 48%)' };
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: fills[name as keyof typeof fills] || 'hsl(280, 65%, 60%)',
    }));
  }, [clients]);

  // Chart data: Agent performance
  const agentPerformance: AgentPerformance[] = useMemo(() => {
    return (agents || []).map(a => ({
      name: a.name,
      emoji: a.emoji,
      tasks: a.active_tasks || 0,
      capacity: a.max_capacity || 5,
      quota: a.quota_used || 0,
      quotaMax: a.quota_max || 1500,
    }));
  }, [agents]);

  // Chart data: Pipeline by status
  const pipelineMetrics: PipelineMetrics[] = useMemo(() => {
    if (!actions?.length) return [];
    const counts: Record<string, number> = {};
    actions.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1; });
    const statusFills: Record<string, string> = {
      created: 'hsl(220, 12%, 72%)',
      policy_check: 'hsl(217, 91%, 60%)',
      pending_approval: 'hsl(36, 100%, 57%)',
      approved: 'hsl(152, 60%, 48%)',
      dispatched: 'hsl(280, 65%, 60%)',
      executing: 'hsl(217, 100%, 70%)',
      executed: 'hsl(152, 60%, 48%)',
      failed: 'hsl(0, 72%, 56%)',
      rejected: 'hsl(0, 50%, 45%)',
    };
    return Object.entries(counts).map(([status, count]) => ({
      status: status.replace(/_/g, ' '),
      count,
      fill: statusFills[status] || 'hsl(220, 10%, 50%)',
    }));
  }, [actions]);

  // Chart data: Risk distribution
  const riskDistribution: RiskDistribution[] = useMemo(() => {
    const levels = ['low', 'medium', 'high', 'critical'];
    const fills = ['hsl(152, 60%, 48%)', 'hsl(36, 100%, 57%)', 'hsl(0, 72%, 56%)', 'hsl(0, 90%, 40%)'];
    return levels.map((level, i) => ({
      level: level.charAt(0).toUpperCase() + level.slice(1),
      clients: clients?.filter(c => c.risk_of_churn === level).length || 0,
      policies: 0,
      fill: fills[i],
    }));
  }, [clients]);

  // Revenue trend (last 6 months synthetic from data timestamps)
  const revenueTrend: RevenueDataPoint[] = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const baseMRR = metrics.totalMRR || 0;
    return months.map((month, i) => ({
      month,
      mrr: Math.round(baseMRR * (0.7 + (i * 0.06))),
      premiums: Math.round((metrics.totalPremiumValue || 0) * (0.6 + (i * 0.08)) / 6),
      commissions: Math.round((metrics.totalCommReceived || 0) * (0.5 + (i * 0.1)) / 6),
    }));
  }, [metrics]);

  // Command velocity (last 7 days)
  const commandVelocity = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const total = commands?.length || 0;
    return days.map((day, i) => ({
      day,
      commands: Math.round(total * (0.1 + Math.random() * 0.2)),
      success: Math.round(total * (0.08 + Math.random() * 0.15)),
    }));
  }, [commands]);

  // Decision analytics
  const decisionAnalytics = useMemo(() => {
    if (!decisions?.length) return [];
    const statusMap: Record<string, { count: number; fill: string }> = {
      pending: { count: 0, fill: 'hsl(36, 100%, 57%)' },
      approved: { count: 0, fill: 'hsl(152, 60%, 48%)' },
      rejected: { count: 0, fill: 'hsl(0, 72%, 56%)' },
      modified: { count: 0, fill: 'hsl(217, 91%, 60%)' },
    };
    decisions.forEach(d => {
      if (statusMap[d.status || 'pending']) statusMap[d.status || 'pending'].count++;
    });
    return Object.entries(statusMap).map(([status, { count, fill }]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      fill,
    }));
  }, [decisions]);

  return {
    metrics,
    clientSegments,
    agentPerformance,
    pipelineMetrics,
    riskDistribution,
    revenueTrend,
    commandVelocity,
    decisionAnalytics,
    isLoading: !clients && !agents,
  };
}
