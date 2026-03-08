import { useState } from 'react';
import { Check, ChevronsUpDown, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export function OrgSwitcher({ className }: { className?: string }) {
  const { user } = useAuth();
  const { organization, organizationId } = useOrganization();
  const navigate = useNavigate();
  const [isSwitching, setIsSwitching] = useState(false);

  // Fetch all orgs the user belongs to (via user_roles)
  const { data: userOrgs } = useQuery({
    queryKey: ['user-orgs', user?.id],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('organization_id, role')
        .eq('user_id', user!.id);

      if (rolesError) throw rolesError;
      if (!roles?.length) return [];

      const orgIds = [...new Set(roles.map(r => r.organization_id))];
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, industry, logo_url')
        .in('id', orgIds);

      if (orgsError) throw orgsError;

      return (orgs || []).map(org => ({
        ...org,
        role: roles.find(r => r.organization_id === org.id)?.role || 'user',
      }));
    },
    enabled: !!user,
  });

  const handleSwitch = async (orgId: string) => {
    if (orgId === organizationId) return;
    setIsSwitching(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ organization_id: orgId })
        .eq('id', user!.id);

      if (error) throw error;

      toast.success('Switched organization');
      // Hard reload to reset all cached data
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to switch organization');
      setIsSwitching(false);
    }
  };

  // Only show if user has access to multiple orgs
  if (!userOrgs || userOrgs.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-7 gap-1.5 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground',
            className
          )}
          disabled={isSwitching}
        >
          <Building2 className="w-3 h-3" />
          <span className="truncate max-w-24">{organization?.name || 'Organization'}</span>
          <ChevronsUpDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Organizations
        </DropdownMenuLabel>
        {userOrgs.map(org => (
          <DropdownMenuItem
            key={org.id}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => handleSwitch(org.id)}
          >
            <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {org.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{org.name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{org.role} · {org.industry || 'General'}</p>
            </div>
            {org.id === organizationId && (
              <Check className="w-4 h-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="flex items-center gap-2 cursor-pointer text-muted-foreground"
          onClick={() => navigate('/organization-setup')}
        >
          <Plus className="w-4 h-4" />
          <span>Create Organization</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
