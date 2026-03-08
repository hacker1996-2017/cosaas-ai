import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ChatMessage {
  id: string;
  sender_type: string;
  sender_name: string | null;
  content: string;
  created_at: string;
  ai_classification?: string | null;
}

/**
 * Hook for the public-facing client chat widget.
 * Uses anon key — no auth required. Messages are scoped by thread_id.
 */
export function useClientChat(organizationId: string) {
  const [threadId] = useState(() => {
    const stored = sessionStorage.getItem(`chat_thread_${organizationId}`);
    if (stored) return stored;
    const id = crypto.randomUUID();
    sessionStorage.setItem(`chat_thread_${organizationId}`, id);
    return id;
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Load existing thread messages
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_type, sender_name, content, created_at, ai_classification')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as ChatMessage[]);
      }
      setIsLoading(false);
    };

    loadMessages();
  }, [threadId]);

  // Realtime subscription for this thread
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [threadId]);

  const sendMessage = useCallback(async (content: string, senderName?: string, senderEmail?: string) => {
    if (!content.trim()) return;
    setIsSending(true);

    try {
      // Insert client message
      const { data: inserted, error } = await supabase
        .from('messages')
        .insert({
          organization_id: organizationId,
          sender_type: 'client',
          sender_name: senderName || 'Visitor',
          sender_email: senderEmail || null,
          channel: 'chat',
          content: content.trim(),
          thread_id: threadId,
          is_internal: false,
          is_read: false,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Trigger AI triage (fire-and-forget via edge function)
      if (inserted?.id) {
        supabase.functions.invoke('triage-inbound', {
          body: { messageId: inserted.id, organizationId },
        }).catch(err => console.error('Triage failed:', err));
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  }, [organizationId, threadId]);

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    threadId,
  };
}