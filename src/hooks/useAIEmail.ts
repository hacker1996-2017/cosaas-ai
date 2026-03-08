import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DraftResult {
  draft: string;
  replyTo?: string;
  subject?: string;
  threadId?: string;
}

export function useAIEmail() {
  const [isDrafting, setIsDrafting] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const generateDraft = async (params: {
    to: string;
    subject: string;
    context?: string;
  }): Promise<DraftResult | null> => {
    setIsDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-email', {
        body: { action: 'draft', ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as DraftResult;
    } catch (err) {
      console.error('AI draft failed:', err);
      throw err;
    } finally {
      setIsDrafting(false);
    }
  };

  const generateReply = async (params: {
    replyToEmailId: string;
    context?: string;
  }): Promise<DraftResult | null> => {
    setIsDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-email', {
        body: { action: 'reply', ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as DraftResult;
    } catch (err) {
      console.error('AI reply failed:', err);
      throw err;
    } finally {
      setIsDrafting(false);
    }
  };

  const summarizeEmail = async (emailId: string): Promise<string | null> => {
    setIsSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-email', {
        body: { action: 'summarize', emailId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data?.summary || null;
    } catch (err) {
      console.error('AI summarize failed:', err);
      throw err;
    } finally {
      setIsSummarizing(false);
    }
  };

  return {
    generateDraft,
    generateReply,
    summarizeEmail,
    isDrafting,
    isSummarizing,
  };
}
