import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface HealthReport {
  type: 'health_report';
  timestamp: string;
  overallScore: number;
  status: 'healthy' | 'degraded' | 'critical';
  agents: { total: number; online: number; busy: number; error: number; overQuota: number };
  commands: { total: number; completed: number; failed: number; queued: number; processing: number };
  pipeline: { total: number; failed: number; executing: number; pendingApproval: number };
  pendingDecisions: number;
  recentErrors: Array<{ id: string; text: string; error: string }>;
  aiInsights: string | null;
}

interface TriageReport {
  type: 'triage_report';
  triage: {
    severity: string;
    rootCause: string;
    affectedComponents: string[];
    fixSteps: string[];
    preventiveMeasures: string[];
    canAutoFix: boolean;
    autoFixAction?: string;
    riskOfAutoFix?: string;
    rawAnalysis?: string;
  };
  originalError: string;
}

interface LogAnalysis {
  type: 'log_analysis';
  analysis: string;
  dataPoints: { commandsAnalyzed: number; pipelineActionsAnalyzed: number; timelineEventsAnalyzed: number };
}

interface DbHealth {
  type: 'db_health';
  tables: Record<string, { count: number }>;
  status: string;
}

type DevOpsResult = HealthReport | TriageReport | LogAnalysis | DbHealth;

export function useDevOps() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [triageReport, setTriageReport] = useState<TriageReport | null>(null);
  const [logAnalysis, setLogAnalysis] = useState<LogAnalysis | null>(null);
  const [dbHealth, setDbHealth] = useState<DbHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(async (body: Record<string, unknown>): Promise<DevOpsResult | null> => {
    if (!user) {
      toast.error('Not authenticated');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('devops-agent', { body });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      const result = data as DevOpsResult;

      switch (result.type) {
        case 'health_report':
          setHealthReport(result as HealthReport);
          break;
        case 'triage_report':
          setTriageReport(result as TriageReport);
          break;
        case 'log_analysis':
          setLogAnalysis(result as LogAnalysis);
          break;
        case 'db_health':
          setDbHealth(result as DbHealth);
          break;
      }

      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'DevOps agent error';
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const runHealthCheck = useCallback(() => invoke({ action: 'health_check' }), [invoke]);
  const runSystemOverview = useCallback(() => invoke({ action: 'system_overview' }), [invoke]);
  const runLogAnalysis = useCallback(() => invoke({ action: 'analyze_logs' }), [invoke]);
  const runDbHealth = useCallback(() => invoke({ action: 'db_health' }), [invoke]);

  const triageError = useCallback((errorMessage: string, functionName?: string, autoExecute?: boolean) =>
    invoke({ action: 'triage_error', errorMessage, functionName, autoExecute }), [invoke]);

  return {
    isLoading,
    error,
    healthReport,
    triageReport,
    logAnalysis,
    dbHealth,
    runHealthCheck,
    runSystemOverview,
    runLogAnalysis,
    runDbHealth,
    triageError,
  };
}
