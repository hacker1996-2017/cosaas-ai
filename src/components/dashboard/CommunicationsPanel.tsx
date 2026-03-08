import { useState } from 'react';
import { 
  Mail, Phone, Plus, Send, Loader2, Clock, 
  CheckCircle, AlertCircle, PhoneCall, PhoneOff, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useEmails } from '@/hooks/useEmails';
import { useCalls } from '@/hooks/useCalls';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CommunicationsPanelProps {
  className?: string;
}

export function CommunicationsPanel({ className }: CommunicationsPanelProps) {
  const { emails, isLoading: emailsLoading, createEmail, isCreating: emailCreating, sendEmail, isSending: emailSending } = useEmails();
  const { calls, isLoading: callsLoading, createCall, isCreating: callCreating } = useCalls();
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);

  const [newEmail, setNewEmail] = useState({
    to: '',
    subject: '',
    body: '',
    from: 'ceo@company.com',
  });

  const [newCall, setNewCall] = useState({
    callee_number: '',
    summary: '',
  });

  const handleCreateEmail = async () => {
    if (!newEmail.to || !newEmail.subject) {
      toast.error('To address and subject are required');
      return;
    }
    try {
      await createEmail({
        to_addresses: [newEmail.to.trim()],
        subject: newEmail.subject.trim(),
        body_text: newEmail.body.trim(),
        from_address: newEmail.from.trim(),
        status: 'draft',
      });
      toast.success('Email draft created');
      setIsEmailDialogOpen(false);
      setNewEmail({ to: '', subject: '', body: '', from: 'ceo@company.com' });
    } catch {
      toast.error('Failed to create email');
    }
  };

  const handleLogCall = async () => {
    if (!newCall.callee_number) {
      toast.error('Phone number is required');
      return;
    }
    try {
      await createCall({
        callee_number: newCall.callee_number.trim(),
        summary: newCall.summary.trim() || null,
        status: 'completed',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
      });
      toast.success('Call logged');
      setIsCallDialogOpen(false);
      setNewCall({ callee_number: '', summary: '' });
    } catch {
      toast.error('Failed to log call');
    }
  };

  const emailStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-3 h-3 text-exec-success" />;
      case 'draft': return <Clock className="w-3 h-3 text-muted-foreground" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-destructive" />;
      default: return <Mail className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const callStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <PhoneOff className="w-3 h-3 text-exec-success" />;
      case 'in_progress': return <PhoneCall className="w-3 h-3 text-exec-warning" />;
      default: return <Phone className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>Communications</span>
        </div>
        <div className="flex gap-1">
          <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-border/40">
                <Mail className="w-3 h-3 mr-1" /> Email
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Compose Email</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>To *</Label>
                  <Input value={newEmail.to} onChange={(e) => setNewEmail({ ...newEmail, to: e.target.value })} placeholder="client@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Subject *</Label>
                  <Input value={newEmail.subject} onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })} placeholder="Meeting Follow-up" />
                </div>
                <div className="space-y-2">
                  <Label>Body</Label>
                  <Textarea value={newEmail.body} onChange={(e) => setNewEmail({ ...newEmail, body: e.target.value })} rows={5} placeholder="Write your message..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateEmail} disabled={emailCreating}>
                  {emailCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Save Draft
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-border/40">
                <Phone className="w-3 h-3 mr-1" /> Call
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Call</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input value={newCall.callee_number} onChange={(e) => setNewCall({ ...newCall, callee_number: e.target.value })} placeholder="+1 555 123 4567" />
                </div>
                <div className="space-y-2">
                  <Label>Summary</Label>
                  <Textarea value={newCall.summary} onChange={(e) => setNewCall({ ...newCall, summary: e.target.value })} rows={3} placeholder="Call notes..." />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCallDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleLogCall} disabled={callCreating}>
                  {callCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Log Call
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="emails" className="p-3">
        <TabsList className="w-full bg-secondary/40 h-8">
          <TabsTrigger value="emails" className="flex-1 text-[11px] h-7 data-[state=active]:bg-background">Emails ({emails.length})</TabsTrigger>
          <TabsTrigger value="calls" className="flex-1 text-[11px] h-7 data-[state=active]:bg-background">Calls ({calls.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="emails">
          <ScrollArea className="h-56">
            {emailsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
            ) : emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="w-6 h-6 text-muted-foreground mb-2 opacity-40" />
                <p className="text-xs text-muted-foreground">No emails yet</p>
              </div>
            ) : (
              <div className="space-y-1.5 mt-2">
                {emails.map((email) => (
                  <div key={email.id} className="p-2.5 rounded-lg space-y-1 border border-border/20"
                    style={{ background: 'hsl(var(--bg-soft) / 0.3)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {emailStatusIcon(email.status || 'draft')}
                        <span className="text-[11px] font-medium text-foreground truncate">{email.subject}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {email.status === 'draft' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 px-1.5 text-[10px] text-primary hover:text-primary"
                            disabled={emailSending}
                            onClick={async () => {
                              try {
                                await sendEmail(email.id);
                                toast.success('Email sent!');
                              } catch {
                                toast.error('Failed to send email');
                              }
                            }}
                          >
                            <Send className="w-2.5 h-2.5 mr-0.5" />
                            Send
                          </Button>
                        )}
                        <span className="text-[9px] text-muted-foreground font-mono">
                          {format(new Date(email.created_at), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      To: {email.to_addresses?.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="calls">
          <ScrollArea className="h-56">
            {callsLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
            ) : calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Phone className="w-6 h-6 text-muted-foreground mb-2 opacity-40" />
                <p className="text-xs text-muted-foreground">No calls logged</p>
              </div>
            ) : (
              <div className="space-y-1.5 mt-2">
                {calls.map((call) => (
                  <div key={call.id} className="p-2.5 rounded-lg space-y-1 border border-border/20"
                    style={{ background: 'hsl(var(--bg-soft) / 0.3)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {callStatusIcon(call.status || 'scheduled')}
                        <span className="text-[11px] font-medium text-foreground font-mono">{call.callee_number}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">
                        {format(new Date(call.created_at), 'MMM d')}
                      </span>
                    </div>
                    {call.summary && (
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{call.summary}</p>
                    )}
                    {call.duration_seconds && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
