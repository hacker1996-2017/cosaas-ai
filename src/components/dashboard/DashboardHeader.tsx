import { LogOut, Settings, Search, User, Building2, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { NotificationCenter } from './NotificationCenter';
import { toast } from 'sonner';

interface DashboardHeaderProps {
  className?: string;
}

export function DashboardHeader({ className }: DashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const { organization } = useOrganization();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2);
  };

  return (
    <header
      className={`h-14 border-b border-border/40 backdrop-blur-xl ${className}`}
      style={{
        background: 'linear-gradient(180deg, hsl(222 47% 8% / 0.95) 0%, hsl(222 47% 6% / 0.9) 100%)',
      }}
    >
      <div className="flex items-center justify-between h-full px-5">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.2) 0%, hsl(217 91% 60% / 0.05) 100%)',
              border: '1px solid hsl(217 91% 60% / 0.2)',
            }}
          >
            <Command className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-tight text-foreground">
              Chief of Staff
              <span className="text-gradient-primary ml-1">AI</span>
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {organization ? (
                <>
                  <Building2 className="w-3 h-3" />
                  <span className="truncate max-w-32">{organization.name}</span>
                  <span className="text-border">·</span>
                  <span className="text-exec-gold font-medium">{organization.industry || 'General'}</span>
                </>
              ) : (
                <span className="tracking-wide uppercase text-[10px]">Executive Operating System</span>
              )}
            </div>
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search commands, clients, decisions..."
              className="pl-9 h-9 bg-secondary/50 border-border/30 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-primary/30 focus-visible:border-primary/40"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:inline-flex h-5 items-center gap-0.5 rounded border border-border/50 bg-background/50 px-1.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-exec-danger" />
          </Button>

          <div className="w-px h-6 bg-border/40 mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                <Avatar className="h-8 w-8 ring-1 ring-border/50">
                  <AvatarImage src="" alt={user?.email || 'User'} />
                  <AvatarFallback className="text-[11px] font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, hsl(217 91% 60% / 0.2) 0%, hsl(217 91% 60% / 0.05) 100%)',
                      color: 'hsl(217 91% 70%)',
                    }}
                  >
                    {user?.email ? getInitials(user.email) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="text-sm font-medium">{user?.email?.split('@')[0] || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
