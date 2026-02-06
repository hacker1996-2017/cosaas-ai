import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { Database } from '@/integrations/supabase/types';

type Organization = Database['public']['Tables']['organizations']['Row'];
type AutonomyLevel = Database['public']['Enums']['autonomy_level'];

export function useOrganization() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  // First get the user's organization_id from their profile
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user!.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Then fetch the organization
  const { data: organization, isLoading, error } = useQuery({
    queryKey: ['organization', profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile!.organization_id!)
        .single();

      if (error) throw error;
      return data as Organization;
    },
    enabled: !!profile?.organization_id,
  });

  // Enable realtime after initial load
  useEffect(() => {
    if (organization && !realtimeEnabled) {
      setRealtimeEnabled(true);
    }
  }, [organization, realtimeEnabled]);

  // Realtime subscription for organization updates
  useRealtimeSubscription<Organization>({
    table: 'organizations',
    enabled: realtimeEnabled && !!profile?.organization_id,
    filter: `id=eq.${profile?.organization_id}`,
    onUpdate: (updatedOrg) => {
      queryClient.setQueryData(['organization', profile?.organization_id], updatedOrg);
    },
  });

  // Update autonomy level mutation
  const updateAutonomyLevel = useMutation({
    mutationFn: async (level: AutonomyLevel) => {
      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('organizations')
        .update({ autonomy_level: level })
        .eq('id', profile.organization_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['organization', profile?.organization_id], data);
    },
  });

  // Update organization settings mutation
  const updateOrganization = useMutation({
    mutationFn: async (updates: Partial<Pick<Organization, 'name' | 'industry' | 'market' | 'settings'>>) => {
      if (!profile?.organization_id) throw new Error('No organization');

      const { data, error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', profile.organization_id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['organization', profile?.organization_id], data);
    },
  });

  return {
    organization,
    organizationId: profile?.organization_id,
    isLoading: isLoading || !profile,
    error,
    autonomyLevel: organization?.autonomy_level || 'draft_actions',
    updateAutonomyLevel: updateAutonomyLevel.mutateAsync,
    updateOrganization: updateOrganization.mutateAsync,
    isUpdating: updateAutonomyLevel.isPending || updateOrganization.isPending,
  };
}
