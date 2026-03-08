import { useState } from 'react';
import {
  Mail, Phone, Send, Loader2, Clock, CheckCircle, AlertCircle,
  PhoneCall, PhoneOff, MessageSquare, Copy, Inbox, Bot, User,
  Sparkles, Reply, Eye, FileText
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
import { useMessages, Message } from '@/hooks/useMessages';
import { useOrganization } from '@/hooks/useOrganization';
import { useAIEmail } from '@/hooks/useAIEmail';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CommunicationsPanelProps {
  className?: string;
}

export function CommunicationsPanel({ className }: CommunicationsPanelProps) {
  const { emails, isLoading: emailsLoading, createEmail, isCreating: emailCreating, sendEmail, isSending: emailSending } = useEmails();
  const { calls, isLoading: callsLoading, createCall, isCreating: callCreating } = useCalls();
  const { messages, isLoading: messagesLoading, sendMessage, isSending: msgSending, unreadCount } = useMessages();
  const { organization } = useOrganization();
  const { generateDraft, generateReply, summarizeEmail, isDrafting, isSummarizing } = useAIEmail();

  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emailSummary, setEmailSummary] = useState<string | null>(null);
  const [aiContext, setAiContext] = useState('');

  const [newEmail, setNewEmail] = useState({
    to: '', subject: '', body: '', from: 'ceo@company.com',
  });
  const [newCall, setNewCall] = useState({
    callee_number: '', summary: '',
  });

  const handleAIDraft = async () => {
    if (!newEmail.to || !newEmail.subject) {
      toast.error('Enter recipient and subject first');
      return;
    }
    try {
      const result = await generateDraft({
        to: newEmail.to.trim(),
        subject: newEmail.subject.trim(),
        context: aiContext || undefined,
      });
      if (result?.draft) {
        setNewEmail(prev => ({ ...prev, body: result.draft }));
        toast.success('AI draft generated');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate draft');
    }
  };

  const handleAIReply = async (emailId: string) => {
    try {
      const result = await generateReply({
        replyToEmailId: emailId,
        context: aiContext || undefined,
      });
      if (result) {
        setNewEmail({
          to: result.replyTo || '',
          subject: result.subject || '',
          body: result.draft,
          from: 'ceo@company.com',
        });
        setIsEmailDialogOpen(true);
        toast.success('AI reply drafted');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate reply');
    }
  };

  const handleSummarize = async (emailId: string) => {
    try {
      setSelectedEmailId(emailId);
      const summary = await summarizeEmail(emailId);
      setEmailSummary(summary);
    } catch (err: any) {
      toast.error(err.message || 'Failed to summarize');
    }
  };

  const handleCreateEmail = async () => {
    if (!newEmail.to || !newEmail.subject) { toast.error('To address and subject are required'); return; }
    try {
      await createEmail({
        to_addresses: [newEmail.to.trim()], subject: newEmail.subject.trim(),
        body_text: newEmail.body.trim(), from_address: newEmail.from.trim(), status: 'draft',
      });
      toast.success('Email draft created');
      setIsEmailDialogOpen(false);
      setNewEmail({ to: '', subject: '', body: '', from: 'ceo@company.com' });
      setAiContext('');
    } catch { toast.error('Failed to create email'); }
  };

  const handleCreateAndSendEmail = async () => {
    if (!newEmail.to || !newEmail.subject) { toast.error('To address and subject are required'); return; }
    try {
      const created = await createEmail({
        to_addresses: [newEmail.to.trim()], subject: newEmail.subject.trim(),
        body_text: newEmail.body.trim(), from_address: newEmail.from.trim(), status: 'draft',
      });
      if (created?.id) {
        await sendEmail(created.id);
        toast.success('Email sent!');
      }
      setIsEmailDialogOpen(false);
      setNewEmail({ to: '', subject: '', body: '', from: 'ceo@company.com' });
      setAiContext('');
    } catch { toast.error('Failed to send email'); }
  };

  const handleLogCall = async () => {
    if (!newCall.callee_number) { toast.error('Phone number is required'); return; }
    try {
      await createCall({
        callee_number: newCall.callee_number.trim(), summary: newCall.summary.trim() || null,
        status: 'completed', started_at: new Date().toISOString(), ended_at: new Date().toISOString(),
      });
      toast.success('Call logged');
      setIsCallDialogOpen(false);
      setNewCall({ callee_number: '', summary: '' });
    } catch { toast.error('Failed to log call'); }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedThread) return;
    try {
      await sendMessage({
        content: replyText.trim(),
        thread_id: selectedThread,
        sender_type: 'human',
        channel: 'chat',
      });
      setReplyText('');
      toast.success('Reply sent');
    } catch { toast.error('Failed to send reply'); }
  };

  const chatLink = organization?.id
    ? `${window.location.origin}/chat/${organization.id}?name=${encodeURIComponent(organization.name || 'Support')}`
    : '';

  const copyChatLink = () => {
    navigator.clipboard.writeText(chatLink);
    toast.success('Chat link copied!');
  };

  // Group messages into threads
  const threadMap: Record<string, Message[]> = {};
  messages.forEach(m => {
    const tid = m.thread_id || m.id;
    if (!threadMap[tid]) threadMap[tid] = [];
    threadMap[tid].push(m);
  });
  const threadList = Object.entries(threadMap)
    .map(([tid, msgs]) => ({
      id: tid,
      lastMessage: msgs[msgs.length - 1],
      messages: msgs,
      unread: msgs.some(m => !m.is_read && m.sender_type === 'client'),
      senderName: msgs.find(m => m.sender_type === 'client')?.sender_name || 'Client',
    }))
    .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());

  const selectedMessages = selectedThread ? threadMap[selectedThread] || [] : [];

  const riskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-[hsl(var(--accent-danger))]';
      case 'medium': return 'text-[hsl(var(--accent-warning))]';
      default: return 'text-[hsl(var(--accent-success))]';
    }
  };

  return (
    <div className={cn('panel', className)}>
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>Communications</span>
          {unreadCount > 0 && (
            <span className="badge-danger px-1.5 py-0.5 rounded-full text-[10px] font-bold">{unreadCount}</span>
          )}
        </div>
        <div className="flex gap-1">
          {chatLink && (
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={copyChatLink} title="Copy client chat link">
              <Copy className="w-3 h-3 mr-1" /> Link
            </Button>
          )}
          {/* Compose Email Dialog */}
          <Dialog open={isEmailDialogOpen} onOpenChange={(open) => {
            setIsEmailDialogOpen(open);
            if (!open) { setAiContext(''); setEmailSummary(null); setSelectedEmailId(null); }
          }}>
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

                {/* AI Context input */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                    AI Instructions (optional)
                  </Label>
                  <Input
                    value={aiContext}
                    onChange={(e) => setAiContext(e.target.value)}
                    placeholder="e.g. Follow up on renewal, mention 10% discount..."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Body</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] px-3 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={handleAIDraft}
                      disabled={isDrafting || !newEmail.to || !newEmail.subject}
                    >
                      {isDrafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {isDrafting ? 'Drafting...' : 'AI Draft'}
                    </Button>
                  </div>
                  <Textarea
                    value={newEmail.body}
                    onChange={(e) => setNewEmail({ ...newEmail, body: e.target.value })}
                    rows={6}
                    placeholder="Write your message or click AI Draft..."
                  />
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

          {/* Log Call Dialog */}
          <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-border/40">
                <Phone className="w-3 h-3 mr-1" /> Call
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Call</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Phone Number *</Label><Input value={newCall.callee_number} onChange={(e) => setNewCall({ ...newCall, callee_number: e.target.value })} placeholder="+1 555 123 4567" /></div>
                <div className="space-y-2"><Label>Summary</Label><Textarea value={newCall.summary} onChange={(e) => setNewCall({ ...newCall, summary: e.target.value })} rows={3} placeholder="Call notes..." /></div>
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

      {/* Email Summary Dialog */}
      <Dialog open={!!emailSummary} onOpenChange={(open) => { if (!open) { setEmailSummary(null); setSelectedEmailId(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI Summary</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-secondary/40 rounded-lg p-4 border border-border/30">
              {emailSummary}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="inbox" className="p-3">
        <TabsList className="w-full bg-secondary/40 h-8">
          <TabsTrigger value="inbox" className="flex-1 text-[11px] h-7 data-[state=active]:bg-background">
            Inbox {unreadCount > 0 && `(${unreadCount})`}
          </TabsTrigger>
          <TabsTrigger value="emails" className="flex-1 text-[11px] h-7 data-[state=active]:bg-background">
            Emails ({emails.length})
          </TabsTrigger>
          <TabsTrigger value="calls" className="flex-1 text-[11px] h-7 data-[state=active]:bg-background">
            Calls ({calls.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Inbox: Live chat threads ── */}
        <TabsContent value="inbox">
          {selectedThread ? (
            <div className="space-y-2">
              <button onClick={() => setSelectedThread(null)} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                ← Back to inbox
              </button>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {selectedMessages.map(msg => (
                    <div key={msg.id} className={cn('flex gap-2 text-xs', msg.sender_type === 'client' ? '' : 'flex-row-reverse')}>
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px]',
                        msg.sender_type === 'client' ? 'bg-primary/20 text-primary' : 'bg-[hsl(var(--accent-success))]/20 text-[hsl(var(--accent-success))]'
                      )}>
                        {msg.sender_type === 'client' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      </div>
                      <div className={cn(
                        'max-w-[75%] p-2 rounded-lg',
                        msg.sender_type === 'client' ? 'bg-secondary/60' : 'bg-primary/10 border border-primary/20'
                      )}>
                        <p className="text-foreground leading-relaxed">{msg.content}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] text-muted-foreground">
                            {msg.sender_name} · {format(new Date(msg.created_at), 'h:mm a')}
                          </span>
                          {msg.ai_auto_responded && <span className="text-[8px] px-1 py-0.5 rounded bg-primary/20 text-primary">AI</span>}
                          {msg.ai_classification && <span className={cn('text-[8px]', riskColor(msg.risk_level))}>{msg.ai_classification}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="flex gap-1.5">
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                  placeholder="Type a reply..."
                  className="text-xs h-8 bg-secondary/40"
                  disabled={msgSending}
                />
                <Button size="sm" className="h-8 px-3" onClick={handleReply} disabled={msgSending || !replyText.trim()}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-56">
              {messagesLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
              ) : threadList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Inbox className="w-6 h-6 text-muted-foreground mb-2 opacity-40" />
                  <p className="text-xs text-muted-foreground">No messages yet</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Share the chat link to start receiving messages</p>
                </div>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {threadList.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => setSelectedThread(thread.id)}
                      className={cn(
                        'w-full text-left p-2.5 rounded-lg space-y-1 border transition-all hover:bg-secondary/80',
                        thread.unread ? 'border-primary/30 bg-primary/5' : 'border-border/20 bg-secondary/30'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {thread.unread && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                          <span className={cn('text-[11px] truncate', thread.unread ? 'font-bold text-foreground' : 'font-medium text-foreground/80')}>
                            {thread.senderName}
                          </span>
                          {thread.lastMessage.ai_classification && (
                            <span className={cn(
                              'text-[9px] px-1 py-0.5 rounded shrink-0',
                              thread.lastMessage.risk_level === 'high' || thread.lastMessage.risk_level === 'critical'
                                ? 'badge-danger' : 'bg-secondary/60 text-muted-foreground'
                            )}>
                              {thread.lastMessage.ai_classification}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                          {format(new Date(thread.lastMessage.created_at), 'MMM d')}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{thread.lastMessage.content}</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </TabsContent>

        {/* ── Emails with AI actions ── */}
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
                  <div key={email.id} className="p-2.5 rounded-lg space-y-1.5 border border-border/20 bg-secondary/30 group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {email.status === 'sent' ? <CheckCircle className="w-3 h-3 text-[hsl(var(--accent-success))]" /> :
                         email.status === 'failed' ? <AlertCircle className="w-3 h-3 text-destructive" /> :
                         <Clock className="w-3 h-3 text-muted-foreground" />}
                        <span className="text-[11px] font-medium text-foreground truncate">{email.subject}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                        {format(new Date(email.created_at), 'MMM d')}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {email.from_address} → {email.to_addresses?.join(', ')}
                    </p>
                    {email.body_text && (
                      <p className="text-[10px] text-muted-foreground/70 line-clamp-2">{email.body_text}</p>
                    )}

                    {/* Action row */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {email.status === 'draft' && (
                        <Button
                          size="sm" variant="ghost"
                          className="h-5 px-1.5 text-[10px] text-primary hover:text-primary"
                          disabled={emailSending}
                          onClick={async () => {
                            try { await sendEmail(email.id); toast.success('Email sent!'); }
                            catch { toast.error('Failed to send'); }
                          }}
                        >
                          <Send className="w-2.5 h-2.5 mr-0.5" /> Send
                        </Button>
                      )}
                      <Button
                        size="sm" variant="ghost"
                        className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-primary"
                        disabled={isDrafting}
                        onClick={() => handleAIReply(email.id)}
                      >
                        {isDrafting ? <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" /> : <Reply className="w-2.5 h-2.5 mr-0.5" />}
                        AI Reply
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-primary"
                        disabled={isSummarizing}
                        onClick={() => handleSummarize(email.id)}
                      >
                        {isSummarizing && selectedEmailId === email.id
                          ? <Loader2 className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                          : <FileText className="w-2.5 h-2.5 mr-0.5" />}
                        Summarize
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* ── Calls ── */}
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
                  <div key={call.id} className="p-2.5 rounded-lg space-y-1 border border-border/20 bg-secondary/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {call.status === 'completed' ? <PhoneOff className="w-3 h-3 text-[hsl(var(--accent-success))]" /> :
                         call.status === 'in_progress' ? <PhoneCall className="w-3 h-3 text-[hsl(var(--accent-warning))]" /> :
                         <Phone className="w-3 h-3 text-muted-foreground" />}
                        <span className="text-[11px] font-medium text-foreground font-mono">{call.callee_number}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-mono">{format(new Date(call.created_at), 'MMM d')}</span>
                    </div>
                    {call.summary && <p className="text-[10px] text-muted-foreground line-clamp-1">{call.summary}</p>}
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
