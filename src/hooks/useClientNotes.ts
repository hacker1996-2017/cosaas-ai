import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ClientNote {
  id: string;
  organization_id: string;
  client_id: string;
  content: string;
  note_type: string;
  is_pinned: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useClientNotes(clientId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useQuery({
    queryKey: ['client_notes', clientId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('client_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClientNote[];
    },
    enabled: !!user && !!clientId,
  });

  const createNote = useMutation({
    mutationFn: async (note: { client_id: string; content: string; note_type?: string }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user!.id)
        .single();
      if (!profile?.organization_id) throw new Error('No organization found');

      const { data, error } = await (supabase as any)
        .from('client_notes')
        .insert({
          ...note,
          organization_id: profile.organization_id,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ClientNote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_notes', clientId] });
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, is_pinned }: { id: string; is_pinned: boolean }) => {
      const { error } = await (supabase as any)
        .from('client_notes')
        .update({ is_pinned })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_notes', clientId] });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('client_notes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_notes', clientId] });
    },
  });

  return {
    notes: notes || [],
    isLoading,
    createNote: createNote.mutateAsync,
    isCreating: createNote.isPending,
    togglePin: togglePin.mutateAsync,
    deleteNote: deleteNote.mutateAsync,
  };
}
