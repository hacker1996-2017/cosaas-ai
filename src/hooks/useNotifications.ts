import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  title: string;
  body: string | null;
  category: string;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  is_dismissed: boolean;
  dismissed_at: string | null;
  action_url: string | null;
  action_label: string | null;
  source_type: string;
  source_id: string | null;
  agent_id: string | null;
  icon: string;
  metadata: Record<string, unknown>;
  expires_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const criticalCount = notifications.filter(
    (n) => !n.is_read && (n.priority === 'critical' || n.priority === 'high')
  ).length;

  // Realtime: auto-refresh on any change
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  useRealtimeSubscription<Record<string, unknown>>({
    table: 'notifications',
    onInsert: (payload) => {
      invalidate();
      const n = payload as unknown as Notification;
      if (n.priority === 'critical') {
        toast.error(n.title, { description: n.body || undefined, duration: 10000 });
      } else if (n.priority === 'high') {
        toast.warning(n.title, { description: n.body || undefined, duration: 6000 });
      }
    },
    onUpdate: invalidate,
    onDelete: invalidate,
    enabled: !!user,
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (!unreadIds.length) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() } as Record<string, unknown>)
        .in('id', unreadIds);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const dismiss = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', notificationId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const dismissAll = useMutation({
    mutationFn: async () => {
      const ids = notifications.map((n) => n.id);
      if (!ids.length) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() } as Record<string, unknown>)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  return {
    notifications,
    unreadCount,
    criticalCount,
    isLoading,
    selectedCategory,
    setSelectedCategory,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
  };
}
