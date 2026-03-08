import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  last_active_at: string | null;
  role: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  invited_by: string;
  email: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export function useUserManagement() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);

  const orgId = profile?.organization_id;

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    try {
      // Get profiles in org
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, last_active_at')
        .eq('organization_id', orgId);
      if (pErr) throw pErr;

      // Get roles for org
      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('organization_id', orgId);
      if (rErr) throw rErr;

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      const merged: TeamMember[] = (profiles || []).map(p => ({
        ...p,
        role: roleMap.get(p.id) || 'user',
      }));
      setMembers(merged);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  }, [orgId]);

  const fetchInvitations = useCallback(async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvitations((data as unknown as Invitation[]) || []);
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([fetchMembers(), fetchInvitations()]).finally(() => setLoading(false));
  }, [orgId, fetchMembers, fetchInvitations]);

  // Realtime for invitations
  useRealtimeSubscription({
    table: 'invitations' as any,
    enabled: !!orgId,
    onInsert: () => fetchInvitations(),
    onUpdate: () => fetchInvitations(),
  });

  const sendInvite = async (email: string, role: string = 'user') => {
    if (!orgId || !user) return;
    setInviteLoading(true);
    try {
      const { error } = await supabase.from('invitations').insert({
        organization_id: orgId,
        invited_by: user.id,
        email: email.toLowerCase().trim(),
        role,
        status: 'pending',
      } as any);
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already invited', description: 'This email already has a pending invitation.', variant: 'destructive' });
        } else {
          throw error;
        }
        return;
      }
      toast({ title: 'Invitation sent', description: `Invite sent to ${email}` });
      fetchInvitations();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setInviteLoading(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'revoked' } as any)
        .eq('id', inviteId);
      if (error) throw error;
      toast({ title: 'Invitation revoked' });
      fetchInvitations();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const resendInvite = async (inviteId: string) => {
    try {
      // Reset expiry
      const { error } = await supabase
        .from('invitations')
        .update({ 
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        } as any)
        .eq('id', inviteId);
      if (error) throw error;
      toast({ title: 'Invitation resent' });
      fetchInvitations();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const updateMemberRole = async (userId: string, newRole: string) => {
    if (!orgId) return;
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('organization_id', orgId);
      if (error) throw error;
      toast({ title: 'Role updated' });
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const removeMember = async (userId: string) => {
    if (!orgId) return;
    try {
      // Remove role
      const { error: rErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('organization_id', orgId);
      if (rErr) throw rErr;
      // Clear org from profile
      const { error: pErr } = await supabase
        .from('profiles')
        .update({ organization_id: null })
        .eq('id', userId);
      if (pErr) throw pErr;
      toast({ title: 'Member removed' });
      fetchMembers();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const pendingInvitations = invitations.filter(i => i.status === 'pending');
  const acceptedInvitations = invitations.filter(i => i.status === 'accepted');

  return {
    members,
    invitations,
    pendingInvitations,
    acceptedInvitations,
    loading,
    inviteLoading,
    sendInvite,
    revokeInvite,
    resendInvite,
    updateMemberRole,
    removeMember,
    refetch: () => Promise.all([fetchMembers(), fetchInvitations()]),
  };
}
