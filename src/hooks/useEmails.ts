import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';

type Email = Database['public']['Tables']['emails']['Row'];
type EmailInsert = Database['public']['Tables']['emails']['Insert'];

export function useEmails(clientId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  const { data: emails, isLoading, error } = useQuery({
    queryKey: ['emails', user?.id, clientId],
    queryFn: async () => {
      let query = supabase
        .from('emails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Email[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (emails && !realtimeEnabled) setRealtimeEnabled(true);
  }, [emails, realtimeEnabled]);

  const createEmail = useMutation({
    mutationFn: async (email: Omit<EmailInsert, 'organization_id'>) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const emailId = crypto.randomUUID();

      const { data, error } = await supabase
        .from('emails')
        .insert({
          ...email,
          id: emailId,
          thread_id: email.thread_id || emailId,
          organization_id: profile.organization_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });

  const sendEmail = useMutation({
    mutationFn: async (emailId: string) => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { emailId },
      });
      if (error) {
        let message = 'Failed to send email';
        try {
          const errorBody = await (error as any).context?.json?.();
          message = errorBody?.error || errorBody?.details?.message || message;
        } catch {
          message = error.message || message;
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data?.details?.message || data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    },
  });

  return {
    emails: emails || [],
    isLoading,
    error,
    createEmail: createEmail.mutateAsync,
    isCreating: createEmail.isPending,
    sendEmail: sendEmail.mutateAsync,
    isSending: sendEmail.isPending,
  };
}
