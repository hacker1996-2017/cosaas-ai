import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, LogIn } from 'lucide-react';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'needs_auth' | 'accepting' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [invite, setInvite] = useState<any>(null);

  // Step 1: Validate token
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Invalid invitation link — no token provided.');
      return;
    }

    const fetchInvite = async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) {
        setStatus('error');
        setError('Invitation not found, expired, or already used.');
        return;
      }

      if (new Date((data as any).expires_at) < new Date()) {
        setStatus('error');
        setError('This invitation has expired. Ask your admin to resend it.');
        return;
      }

      setInvite(data);

      if (authLoading) return; // Wait for auth to settle
      if (!user) {
        setStatus('needs_auth');
      } else {
        acceptInvitation(data, user.id);
      }
    };

    fetchInvite();
  }, [token, user, authLoading]);

  const acceptInvitation = async (inv: any, userId: string) => {
    setStatus('accepting');
    try {
      // 1. Update profile with organization_id
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ organization_id: inv.organization_id })
        .eq('id', userId);
      if (profileErr) throw profileErr;

      // 2. Insert user role
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          organization_id: inv.organization_id,
          role: inv.role,
        });
      if (roleErr && roleErr.code !== '23505') throw roleErr; // Ignore duplicate

      // 3. Mark invitation accepted
      await supabase
        .from('invitations')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() } as any)
        .eq('id', inv.id);

      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to accept invitation.');
    }
  };

  const goToAuth = () => {
    navigate(`/auth?redirect=/accept-invite?token=${token}`);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border/50 bg-card p-8 space-y-6 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Validating invitation…</p>
          </>
        )}

        {status === 'needs_auth' && (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">You're Invited!</h2>
            <p className="text-sm text-muted-foreground">
              You've been invited to join the team. Please sign in or create an account to continue.
            </p>
            <Button onClick={goToAuth} className="w-full">
              Sign In / Sign Up
            </Button>
          </>
        )}

        {status === 'accepting' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Joining the team…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-full bg-accent-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-accent-success" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Welcome to the Team!</h2>
            <p className="text-sm text-muted-foreground">
              Your account is now connected to the organization.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Dashboard
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Invitation Error</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Go to Sign In
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
