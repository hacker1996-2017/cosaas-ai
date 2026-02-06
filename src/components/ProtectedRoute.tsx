import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { loading: profileLoading, hasOrganization } = useUserProfile();
  const location = useLocation();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing Executive OS...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user already has an organization and is on setup page, redirect to home
  if (hasOrganization && location.pathname === '/setup-organization') {
    return <Navigate to="/" replace />;
  }

  // If user has no organization and not already on setup page, redirect to setup
  if (!hasOrganization && location.pathname !== '/setup-organization') {
    return <Navigate to="/setup-organization" replace />;
  }

  return <>{children}</>;
}
