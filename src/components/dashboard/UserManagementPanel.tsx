import { useState } from 'react';
import { useUserManagement, TeamMember, Invitation } from '@/hooks/useUserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, UserPlus, Shield, ShieldCheck, Crown, Mail, MoreHorizontal,
  Clock, CheckCircle2, XCircle, RefreshCw, Trash2, Loader2
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

const roleConfig: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  ceo: { label: 'CEO', icon: Crown, color: 'text-yellow-400' },
  admin: { label: 'Admin', icon: ShieldCheck, color: 'text-blue-400' },
  user: { label: 'Member', icon: Shield, color: 'text-muted-foreground' },
};

export function UserManagementPanel() {
  const { user } = useAuth();
  const {
    members, pendingInvitations, loading, inviteLoading,
    sendInvite, revokeInvite, resendInvite, updateMemberRole, removeMember,
  } = useUserManagement();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    await sendInvite(inviteEmail, inviteRole);
    setInviteEmail('');
    setInviteRole('user');
    setInviteOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Team Management</h3>
          <Badge variant="secondary" className="text-[10px]">{members.length}</Badge>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-7 text-xs gap-1.5">
              <UserPlus className="w-3 h-3" /> Invite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button onClick={handleSendInvite} disabled={!inviteEmail || inviteLoading}>
                {inviteLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Mail className="w-3 h-3 mr-1" />}
                Send Invite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="w-full h-8">
          <TabsTrigger value="members" className="text-xs flex-1 gap-1">
            <Users className="w-3 h-3" /> Members
          </TabsTrigger>
          <TabsTrigger value="invites" className="text-xs flex-1 gap-1">
            <Mail className="w-3 h-3" /> Pending
            {pendingInvitations.length > 0 && (
              <Badge variant="destructive" className="text-[9px] h-4 px-1 ml-1">{pendingInvitations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-3">
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {members.map(member => (
                <MemberRow
                  key={member.id}
                  member={member}
                  isCurrentUser={member.id === user?.id}
                  onUpdateRole={updateMemberRole}
                  onRemove={removeMember}
                />
              ))}
              {members.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No team members yet</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="invites" className="mt-3">
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-1">
              {pendingInvitations.map(invite => (
                <InviteRow
                  key={invite.id}
                  invite={invite}
                  onRevoke={revokeInvite}
                  onResend={resendInvite}
                />
              ))}
              {pendingInvitations.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No pending invitations</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MemberRow({
  member, isCurrentUser, onUpdateRole, onRemove,
}: {
  member: TeamMember;
  isCurrentUser: boolean;
  onUpdateRole: (id: string, role: string) => void;
  onRemove: (id: string) => void;
}) {
  const cfg = roleConfig[member.role] || roleConfig.user;
  const RoleIcon = cfg.icon;
  const initials = (member.full_name || member.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors group">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-foreground truncate">
            {member.full_name || member.email}
          </span>
          {isCurrentUser && <Badge variant="outline" className="text-[8px] h-3.5 px-1">You</Badge>}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <RoleIcon className={`w-3 h-3 ${cfg.color}`} />
          <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
          {member.last_active_at && (
            <>
              <span className="text-[10px] text-muted-foreground/50">·</span>
              <span className="text-[10px] text-muted-foreground/70">
                {formatDistanceToNow(new Date(member.last_active_at), { addSuffix: true })}
              </span>
            </>
          )}
        </div>
      </div>
      {!isCurrentUser && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {member.role !== 'admin' && (
              <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'admin')}>
                <ShieldCheck className="w-3 h-3 mr-2" /> Promote to Admin
              </DropdownMenuItem>
            )}
            {member.role === 'admin' && (
              <DropdownMenuItem onClick={() => onUpdateRole(member.id, 'user')}>
                <Shield className="w-3 h-3 mr-2" /> Set as Member
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onRemove(member.id)} className="text-destructive">
              <Trash2 className="w-3 h-3 mr-2" /> Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function InviteRow({
  invite, onRevoke, onResend,
}: {
  invite: Invitation;
  onRevoke: (id: string) => void;
  onResend: (id: string) => void;
}) {
  const isExpired = new Date(invite.expires_at) < new Date();
  const cfg = roleConfig[invite.role] || roleConfig.user;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 transition-colors group">
      <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground truncate block">{invite.email}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="outline" className="text-[9px] h-4 px-1">{cfg.label}</Badge>
          {isExpired ? (
            <Badge variant="destructive" className="text-[9px] h-4 px-1">Expired</Badge>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onResend(invite.id)} title="Resend">
          <RefreshCw className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRevoke(invite.id)} title="Revoke">
          <XCircle className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
