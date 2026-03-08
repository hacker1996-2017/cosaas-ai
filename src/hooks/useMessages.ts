import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Message {
  id: string;
  organization_id: string;
  client_id: string | null;
  agent_id: string | null;
  sender_type: 'client' | 'agent' | 'system' | 'human';
  sender_name: string | null;
  sender_email: string | null;
  channel: 'chat' | 'email' | 'phone' | 'portal';
  content: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  is_internal: boolean;
  ai_classification: string | null;
  ai_confidence: number | null;
  ai_auto_responded: boolean;
  risk_level: string;
  action_pipeline_id: string | null;
  thread_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useMessages(threadId?: string, clientId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['messages', user?.id, threadId, clientId];

  const { data: messages, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (threadId) query = query.eq('thread_id', threadId);
      if (clientId) query = query.eq('client_id', clientId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!user,
  });

  // Realtime subscription for messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            queryClient.setQueryData<Message[]>(queryKey, (old) => {
              const msg = payload.new as Message;
              if (!old) return [msg];
              if (old.some(m => m.id === msg.id)) return old;
              return [...old, msg];
            });
          } else if (payload.eventType === 'UPDATE') {
            queryClient.setQueryData<Message[]>(queryKey, (old) => {
              const msg = payload.new as Message;
              if (!old) return [msg];
              return old.map(m => m.id === msg.id ? msg : m);
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, threadId, clientId]);

  const sendMessage = useMutation({
    mutationFn: async (msg: {
      content: string;
      channel?: string;
      client_id?: string;
      thread_id?: string;
      sender_type?: string;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, full_name')
        .eq('id', user!.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          organization_id: profile.organization_id,
          client_id: msg.client_id || null,
          sender_type: msg.sender_type || 'human',
          sender_name: profile.full_name || user!.email,
          channel: msg.channel || 'chat',
          content: msg.content,
          thread_id: msg.thread_id || null,
          is_internal: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Message;
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
      if (error) throw error;
    },
  });

  const unreadCount = messages?.filter(m => !m.is_read && m.sender_type === 'client').length || 0;

  const threads = messages?.reduce((acc, msg) => {
    const tid = msg.thread_id || msg.id;
    if (!acc[tid]) acc[tid] = [];
    acc[tid].push(msg);
    return acc;
  }, {} as Record<string, Message[]>) || {};

  return {
    messages: messages || [],
    isLoading,
    error,
    sendMessage: sendMessage.mutateAsync,
    isSending: sendMessage.isPending,
    markAsRead: markAsRead.mutateAsync,
    unreadCount,
    threads,
  };
}