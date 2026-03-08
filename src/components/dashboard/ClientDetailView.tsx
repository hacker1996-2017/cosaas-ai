import { useState } from 'react';
import {
  User, Mail, Phone, Building, TrendingUp, TrendingDown,
  DollarSign, Shield, MessageSquare, ArrowLeft, Loader2,
  Plus, Pin, PinOff, Trash2, CheckCircle, Circle, Calendar,
  Clock, AlertTriangle, Activity, FileText, Tag, Heart,
  Send, PhoneCall, StickyNote, ListTodo, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useEmails } from '@/hooks/useEmails';
import { useCalls } from '@/hooks/useCalls';
import { useClientNotes } from '@/hooks/useClientNotes';
import { useClientTasks, ClientTask } from '@/hooks/useClientTasks';
import { Database } from '@/integrations/supabase/types';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { toast } from 'sonner';

type Client = Database['public']['Tables']['clients']['Row'];

interface ClientDetailViewProps {
  client: Client;
  onBack: () => void;
}

const priorityConfig: Record<string, { label: string; class: string; icon: string }> = {
  low: { label: 'Low', class: 'text-muted-foreground', icon: '○' },
  medium: { label: 'Medium', class: 'text-[hsl(var(--accent-warning))]', icon: '◐' },
  high: { label: 'High', class: 'text-destructive', icon: '●' },
  urgent: { label: 'Urgent', class: 'text-destructive font-bold', icon: '⬤' },
};

const noteTypeConfig: Record<string, { label: string; color: string }> = {
  note: { label: 'Note', color: 'bg-primary/10 text-primary' },
  call_note: { label: 'Call Note', color: 'bg-[hsl(var(--accent-success))]/10 text-[hsl(var(--accent-success))]' },
  meeting_note: { label: 'Meeting', color: 'bg-[hsl(var(--accent-warning))]/10 text-[hsl(var(--accent-warning))]' },
  follow_up: { label: 'Follow-up', color: 'bg-destructive/10 text-destructive' },
};

export function ClientDetailView({ client, onBack }: ClientDetailViewProps) {
  const { emails, isLoading: emailsLoading } = useEmails(client.id);
  const { calls, isLoading: callsLoading } = useCalls(client.id);
  const { notes, isLoading: notesLoading, createNote, isCreating: noteCreating, togglePin, deleteNote } = useClientNotes(client.id);
  const { tasks, isLoading: tasksLoading, createTask, isCreating: taskCreating, toggleComplete, deleteTask } = useClientTasks(client.id);

  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const healthScore = (client as any).health_score || 75;
  const healthColor = healthScore >= 70 ? 'text-[hsl(var(--accent-success))]' : healthScore >= 40 ? 'text-[hsl(var(--accent-warning))]' : 'text-destructive';

  const handleCreateNote = async () => {
    if (!newNote.trim()) return;
    try {
      await createNote({ client_id: client.id, content: newNote.trim(), note_type: noteType });
      setNewNote('');
      toast.success('Note added');
    } catch { toast.error('Failed to add note'); }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;
    try {
      await createTask({
        client_id: client.id,
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        due_date: newTaskDueDate || undefined,
      });
      setNewTaskTitle('');
      setNewTaskDueDate('');
      toast.success('Task created');
    } catch { toast.error('Failed to create task'); }
  };

  // Unified timeline
  const timeline = [
    ...emails.map(e => ({
      type: 'email' as const,
      date: e.created_at,
      title: e.subject,
      detail: `${e.from_address} → ${e.to_addresses?.join(', ')}`,
      status: e.status,
      direction: (e.metadata as Record<string, unknown>)?.direction === 'inbound' ? 'inbound' : 'outbound',
    })),
    ...calls.map(c => ({
      type: 'call' as const,
      date: c.created_at,
      title: c.summary || 'Phone call',
      detail: c.callee_number,
      status: c.status,
      direction: 'outbound' as const,
    })),
    ...notes.map(n => ({
      type: 'note' as const,
      date: n.created_at,
      title: noteTypeConfig[n.note_type]?.label || 'Note',
      detail: n.content,
      status: null,
      direction: null,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const completedTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button size="sm" variant="ghost" onClick={onBack} className="h-7 px-2 shrink-0 mt-0.5">
          <ArrowLeft className="w-3.5 h-3.5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground truncate">{client.name}</h3>
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded capitalize shrink-0',
              client.status === 'active' ? 'badge-success' :
              client.status === 'prospect' ? 'bg-primary/15 text-primary border border-primary/20' :
              client.status === 'churned' ? 'badge-danger' : 'badge-warning'
            )}>
              {client.status}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {client.company || 'No company'}{client.industry ? ` • ${client.industry}` : ''} • {client.client_type}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        <div className="p-2 rounded-lg bg-secondary/40 text-center">
          <p className="text-xs font-bold text-foreground">${Number(client.mrr || 0).toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">MRR</p>
        </div>
        <div className="p-2 rounded-lg bg-secondary/40 text-center">
          <p className="text-xs font-bold text-foreground">${Number(client.lifetime_value || 0).toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground">LTV</p>
        </div>
        <div className="p-2 rounded-lg bg-secondary/40 text-center">
          <p className={cn('text-xs font-bold', healthColor)}>{healthScore}%</p>
          <p className="text-[9px] text-muted-foreground">Health</p>
        </div>
        <div className="p-2 rounded-lg bg-secondary/40 text-center">
          <p className="text-xs font-bold text-foreground capitalize">{client.risk_of_churn || 'low'}</p>
          <p className="text-[9px] text-muted-foreground">Risk</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full bg-secondary/40 h-8">
          <TabsTrigger value="overview" className="flex-1 text-[10px] h-7 data-[state=active]:bg-background gap-1">
            <User className="w-3 h-3" /> Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 text-[10px] h-7 data-[state=active]:bg-background gap-1">
            <Activity className="w-3 h-3" /> Activity
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 text-[10px] h-7 data-[state=active]:bg-background gap-1">
            <StickyNote className="w-3 h-3" /> Notes
            {notes.length > 0 && <span className="text-[9px] opacity-60">({notes.length})</span>}
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex-1 text-[10px] h-7 data-[state=active]:bg-background gap-1">
            <ListTodo className="w-3 h-3" /> Tasks
            {pendingTasks.length > 0 && (
              <span className="text-[9px] px-1 rounded-full bg-primary/20 text-primary">{pendingTasks.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview">
          <ScrollArea className="h-52">
            <div className="space-y-3 pt-1">
              {/* Contact Info */}
              <div className="p-2.5 rounded-lg bg-secondary/30 space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contact</p>
                {client.email && (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-primary truncate">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-foreground">{client.phone}</span>
                  </div>
                )}
                {client.primary_contact_name && (
                  <div className="mt-1.5 pt-1.5 border-t border-border/20">
                    <p className="text-[10px] text-muted-foreground mb-1">Primary Contact</p>
                    <p className="text-xs text-foreground font-medium">{client.primary_contact_name}</p>
                    {client.primary_contact_email && (
                      <p className="text-[11px] text-primary">{client.primary_contact_email}</p>
                    )}
                    {client.primary_contact_phone && (
                      <p className="text-[11px] text-muted-foreground">{client.primary_contact_phone}</p>
                    )}
                  </div>
                )}
              </div>

              {/* AI Insights */}
              <div className="p-2.5 rounded-lg bg-card border border-border/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <Heart className={cn('w-3.5 h-3.5', healthColor)} />
                  <span className="text-[11px] font-semibold text-foreground">AI Health Assessment</span>
                </div>
                <div className="w-full bg-secondary/60 rounded-full h-1.5 mb-2">
                  <div
                    className={cn('h-1.5 rounded-full transition-all', healthScore >= 70 ? 'bg-[hsl(var(--accent-success))]' : healthScore >= 40 ? 'bg-[hsl(var(--accent-warning))]' : 'bg-destructive')}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {client.expansion_opportunity === 'high'
                    ? '🚀 High upsell potential — recommend scheduling expansion conversation.'
                    : client.expansion_opportunity === 'medium'
                    ? '📈 Moderate growth potential — monitor engagement metrics closely.'
                    : '✅ Stable engagement — maintain current service level.'}
                </p>
                {client.risk_of_churn === 'high' || client.risk_of_churn === 'critical' ? (
                  <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-destructive" />
                      <span className="text-[10px] font-medium text-destructive">Churn risk detected — immediate attention needed</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Tags */}
              {client.tags && client.tags.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {client.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Activity Tab ── */}
        <TabsContent value="activity">
          <ScrollArea className="h-52">
            {(emailsLoading || callsLoading || notesLoading) ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            ) : timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="w-6 h-6 text-muted-foreground mb-2 opacity-40" />
                <p className="text-xs text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="relative pl-4 space-y-0 pt-1">
                {/* Timeline line */}
                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border/40" />

                {timeline.slice(0, 30).map((item, i) => (
                  <div key={i} className="relative flex items-start gap-2.5 pb-3">
                    {/* Dot */}
                    <div className={cn(
                      'absolute left-[-13px] top-1 w-2.5 h-2.5 rounded-full border-2 border-background shrink-0',
                      item.type === 'email' ? 'bg-primary' :
                      item.type === 'call' ? 'bg-[hsl(var(--accent-success))]' :
                      'bg-[hsl(var(--accent-warning))]'
                    )} />
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.type === 'email' ? <Mail className="w-3 h-3 text-primary shrink-0" /> :
                         item.type === 'call' ? <PhoneCall className="w-3 h-3 text-[hsl(var(--accent-success))] shrink-0" /> :
                         <StickyNote className="w-3 h-3 text-[hsl(var(--accent-warning))] shrink-0" />}
                        <span className="text-[11px] font-medium text-foreground truncate">{item.title}</span>
                        {item.direction === 'inbound' && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-primary/10 text-primary shrink-0">IN</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.detail}</p>
                      <span className="text-[9px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* ── Notes Tab ── */}
        <TabsContent value="notes">
          <div className="space-y-2 pt-1">
            {/* Add note */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Select value={noteType} onValueChange={setNoteType}>
                  <SelectTrigger className="h-7 w-auto min-w-[90px] text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(noteTypeConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1.5">
                <Textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="text-xs resize-none"
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleCreateNote(); }}
                />
                <Button size="sm" className="h-auto px-3 shrink-0" onClick={handleCreateNote} disabled={noteCreating || !newNote.trim()}>
                  {noteCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            {/* Notes list */}
            <ScrollArea className="h-40">
              {notesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              ) : notes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No notes yet</p>
              ) : (
                <div className="space-y-1.5">
                  {notes.map(note => (
                    <div key={note.id} className={cn(
                      'p-2.5 rounded-lg border text-xs group',
                      note.is_pinned ? 'bg-primary/5 border-primary/20' : 'bg-secondary/30 border-border/20'
                    )}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={cn('text-[9px] px-1.5 py-0.5 rounded', noteTypeConfig[note.note_type]?.color || noteTypeConfig.note.color)}>
                              {noteTypeConfig[note.note_type]?.label || 'Note'}
                            </span>
                            {note.is_pinned && <Pin className="w-2.5 h-2.5 text-primary" />}
                            <span className="text-[9px] text-muted-foreground">
                              {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-foreground whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            className="p-1 rounded hover:bg-secondary transition-colors"
                            onClick={() => togglePin({ id: note.id, is_pinned: !note.is_pinned })}
                          >
                            {note.is_pinned
                              ? <PinOff className="w-3 h-3 text-muted-foreground" />
                              : <Pin className="w-3 h-3 text-muted-foreground" />}
                          </button>
                          <button
                            className="p-1 rounded hover:bg-destructive/10 transition-colors"
                            onClick={() => deleteNote(note.id)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive/60" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>

        {/* ── Tasks Tab ── */}
        <TabsContent value="tasks">
          <div className="space-y-2 pt-1">
            {/* Add task */}
            <div className="flex gap-1.5">
              <Input
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Add a task..."
                className="h-8 text-xs flex-1"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateTask(); }}
              />
              <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                <SelectTrigger className="h-8 w-auto min-w-[80px] text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={newTaskDueDate}
                onChange={e => setNewTaskDueDate(e.target.value)}
                className="h-8 w-[120px] text-[10px]"
              />
              <Button size="sm" className="h-8 px-3" onClick={handleCreateTask} disabled={taskCreating || !newTaskTitle.trim()}>
                {taskCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              </Button>
            </div>

            {/* Task list */}
            <ScrollArea className="h-40">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No tasks yet</p>
              ) : (
                <div className="space-y-1">
                  {/* Pending */}
                  {pendingTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/20 group">
                      <button
                        className="shrink-0"
                        onClick={() => toggleComplete({ id: task.id, completed: true })}
                      >
                        <Circle className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground truncate">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn('text-[9px]', priorityConfig[task.priority]?.class || 'text-muted-foreground')}>
                            {priorityConfig[task.priority]?.icon} {priorityConfig[task.priority]?.label}
                          </span>
                          {task.due_date && (
                            <span className={cn(
                              'text-[9px] flex items-center gap-0.5',
                              isPast(new Date(task.due_date)) ? 'text-destructive font-medium' : 'text-muted-foreground'
                            )}>
                              <Calendar className="w-2.5 h-2.5" />
                              {format(new Date(task.due_date), 'MMM d')}
                              {isPast(new Date(task.due_date)) && ' (overdue)'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        className="p-1 rounded hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive/60" />
                      </button>
                    </div>
                  ))}

                  {/* Completed */}
                  {completedTasks.length > 0 && (
                    <>
                      <p className="text-[10px] text-muted-foreground font-medium pt-2 pb-1">
                        Completed ({completedTasks.length})
                      </p>
                      {completedTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 opacity-60 group">
                          <button
                            className="shrink-0"
                            onClick={() => toggleComplete({ id: task.id, completed: false })}
                          >
                            <CheckCircle className="w-4 h-4 text-[hsl(var(--accent-success))]" />
                          </button>
                          <p className="text-xs text-muted-foreground line-through truncate flex-1">{task.title}</p>
                          <button
                            className="p-1 rounded hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                            onClick={() => deleteTask(task.id)}
                          >
                            <Trash2 className="w-3 h-3 text-destructive/60" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
