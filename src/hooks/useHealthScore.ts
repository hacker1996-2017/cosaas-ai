import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HealthScoreResult {
  clientId: string;
  clientName: string;
  healthScore: number;
  riskLevel: string;
  breakdown: {
    engagementScore: number;
    financialScore: number;
    operationalScore: number;
    sentimentScore: number;
  };
  recommendations: string[];
  signals: {
    msgCount: number;
    activePolicies: number;
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
  };
}

export function useHealthScore() {
  const [lastResults, setLastResults] = useState<HealthScoreResult[]>([]);

  const computeScore = useMutation({
    mutationFn: async (clientId?: string) => {
      const { data, error } = await supabase.functions.invoke('ai-health-score', {
        body: { clientId },
      });

      if (error) throw new Error(error.message || 'Failed to compute health score');
      if (data?.error) throw new Error(data.error);

      const results = (data?.results || []) as HealthScoreResult[];
      setLastResults(results);
      return results;
    },
  });

  return {
    computeScore: computeScore.mutateAsync,
    isComputing: computeScore.isPending,
    lastResults,
    error: computeScore.error,
  };
}
