import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCommands } from '@/hooks/useCommands';
import { CommandMessage } from './command-center/CommandMessage';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'ceo' | 'ai';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  confidenceScore?: number;
  riskLevel?: string;
  commandId?: string;
  commandStatus?: string;
  result?: Record<string, unknown> | null;
}

const suggestedCommands = [
  'Add new client',
  'Send email',
  'Check status',
  'Schedule call',
  'Generate report',
];

interface CommandCenterProps {
  className?: string;
}

export function CommandCenter({ className }: CommandCenterProps) {
  const { user } = useAuth();
  const { commands, createCommand, respondToCommand, isCreating, isResponding, stats } = useCommands();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build chat messages from commands
  const messages: ChatMessage[] = buildMessagesFromCommands(commands);

  // Add welcome message at the start
  const welcomeMsg: ChatMessage = {
    id: 'welcome',
    role: 'ai',
    content: 'Good morning. I am fully synchronized with company objectives, active risks, and prior executive decisions. I will ask clarifying questions when needed to ensure precise execution. How would you like to proceed?',
    timestamp: new Date(Date.now() - 1000),
    confidenceScore: 0.98,
  };

  const allMessages = [welcomeMsg, ...messages];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [allMessages.length, isCreating]);

  const handleSend = async () => {
    if (!input.trim() || isCreating) return;
    const commandText = input.trim();
    setInput('');

    try {
      const result = await createCommand(commandText);

      if (result.aiResult?.status === 'awaiting_clarification') {
        // No toast — the AI message in chat is the clarification
      } else if (result.aiResult?.status === 'executed') {
        const dur = result.aiResult.executionResult?.duration_ms;
        toast.success(`Command executed${dur ? ` in ${dur}ms` : ''}. Evidence collected.`);
      } else if (result.aiResult?.status === 'pending_decision') {
        toast.success('Command analyzed. Decision pending in Decision Center.');
      } else if (result.aiResult?.status === 'approved') {
        toast.success('Command approved and dispatched.');
      } else {
        toast.success('Command routed for processing.');
      }
    } catch (error) {
      console.error('Failed to create command:', error);
      if (error instanceof Error && error.message.includes('organization')) {
        toast.error('Please complete your organization setup first.');
      } else {
        toast.error('Failed to send command. Please try again.');
      }
    }
  };

  const handleClarificationReply = useCallback(async (commandId: string, reply: string) => {
    try {
      await respondToCommand(commandId, reply);
    } catch (error) {
      console.error('Failed to respond:', error);
      toast.error('Failed to send response. Please try again.');
    }
  }, [respondToCommand]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="panel-header flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>Command Center</span>
        <div className="ml-auto flex items-center gap-2">
          {stats.active > 0 && (
            <span className="badge-warning px-2 py-0.5 rounded text-[10px] font-medium">{stats.active} active</span>
          )}
          {stats.queued > 0 && (
            <span className="badge-info px-2 py-0.5 rounded text-[10px] font-medium">{stats.queued} queued</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {allMessages.map((message) => (
            <CommandMessage
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
              status={message.status}
              commandStatus={message.commandStatus}
              result={message.result as any}
              confidenceScore={message.confidenceScore}
              riskLevel={message.riskLevel}
              onClarificationReply={
                message.result?.awaiting_clarification && message.commandId
                  ? (reply: string) => handleClarificationReply(message.commandId!, reply)
                  : undefined
              }
              isReplying={isResponding}
            />
          ))}

          {(isCreating || isResponding) && (
            <div className="flex items-start animate-fade-in">
              <div className="chat-bubble ai">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
                  <span className="text-[10px] text-muted-foreground/60 ml-1">
                    {isResponding ? 'Processing your response...' : 'Analyzing command...'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Organization Warning */}
      {user && commands.length === 0 && (
        <div className="px-4 py-2 border-t border-border/30">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/50 rounded-lg p-2.5 border border-border/30">
            <AlertCircle className="w-3.5 h-3.5 text-exec-warning shrink-0" />
            <span>Complete organization setup to enable full command execution.</span>
          </div>
        </div>
      )}

      {/* Suggested Commands */}
      <div className="px-4 py-2.5 border-t border-border/30">
        <div className="flex flex-wrap gap-1.5">
          {suggestedCommands.map((command) => (
            <button
              key={command}
              onClick={() => setInput(command)}
              className="group flex items-center gap-1 px-3 py-1.5 text-[11px] rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-primary/10 hover:border-primary/20 border border-transparent transition-all duration-200"
            >
              {command}
              <ArrowRight className="w-2.5 h-2.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div
        className="p-4 border-t border-border/30"
        style={{
          background: 'linear-gradient(180deg, hsl(222 47% 8% / 0.5) 0%, hsl(222 47% 6% / 0.8) 100%)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Issue a command..."
              className="pr-10 h-10 bg-secondary/40 border-border/30 text-sm focus-visible:ring-primary/30 focus-visible:border-primary/40 placeholder:text-muted-foreground/50"
              disabled={isCreating || isResponding}
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors">
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <Button
            onClick={handleSend}
            size="icon"
            className="shrink-0 h-10 w-10 rounded-lg"
            disabled={isCreating || isResponding || !input.trim()}
            style={{
              background: input.trim()
                ? 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 100% 70%) 100%)'
                : undefined,
            }}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: Build chat messages from DB commands ───────────────────────────
function buildMessagesFromCommands(
  commands: Array<Record<string, unknown>>
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  for (const cmd of commands) {
    const id = cmd.id as string;
    const commandText = cmd.command_text as string;
    const status = cmd.status as string;
    const result = cmd.result as Record<string, unknown> | null;
    const createdAt = cmd.created_at as string;
    const completedAt = cmd.completed_at as string | null;
    const confidenceScore = cmd.confidence_score as number | null;
    const errorMessage = cmd.error_message as string | null;

    // CEO message
    messages.push({
      id: `cmd-${id}`,
      role: 'ceo',
      content: commandText,
      timestamp: new Date(createdAt),
      status: 'sent',
    });

    // If user sent a clarification response, show it
    if (result?.user_clarification) {
      messages.push({
        id: `clarify-${id}`,
        role: 'ceo',
        content: result.user_clarification as string,
        timestamp: new Date(new Date(createdAt).getTime() + 1000),
        status: 'sent',
      });
    }

    // AI response
    const hasRichMessage = result?.ai_message;

    if (hasRichMessage) {
      messages.push({
        id: `resp-${id}`,
        role: 'ai',
        content: result.ai_message as string,
        timestamp: completedAt ? new Date(completedAt) : new Date(new Date(createdAt).getTime() + 2000),
        confidenceScore: confidenceScore ? Number(confidenceScore) : 0.9,
        riskLevel: result.ai_message_type === 'pending_decision' ? 'medium' : undefined,
        commandId: id,
        commandStatus: status,
        result: result,
      });
    } else if (status === 'completed') {
      // Legacy: no rich message
      const execResult = result?.execution_result as Record<string, unknown> | null;
      let summary = 'Command executed successfully.';
      if (execResult?.report) summary = String(execResult.report).substring(0, 300);
      else if (execResult?.clientId) summary = `✅ Client operation completed.`;
      else if (execResult?.resendId) summary = `✅ Email sent. ID: ${execResult.resendId}`;
      else if (execResult?.taskId) summary = `✅ Task created.`;

      messages.push({
        id: `resp-${id}`,
        role: 'ai',
        content: summary,
        timestamp: completedAt ? new Date(completedAt) : new Date(createdAt),
        confidenceScore: confidenceScore ? Number(confidenceScore) : 0.9,
      });
    } else if (status === 'failed') {
      messages.push({
        id: `resp-${id}`,
        role: 'ai',
        content: errorMessage || 'Command execution failed. Please try again.',
        timestamp: new Date(createdAt),
        riskLevel: 'high',
      });
    } else if (status === 'in_progress' && !hasRichMessage) {
      messages.push({
        id: `resp-${id}`,
        role: 'ai',
        content: `Processing: "${commandText}". Analyzing and coordinating with agents...`,
        timestamp: new Date(createdAt),
        confidenceScore: 0.85,
      });
    } else if (status === 'queued' && !hasRichMessage) {
      messages.push({
        id: `resp-${id}`,
        role: 'ai',
        content: `Understood. Routing "${commandText}" through the governance pipeline.`,
        timestamp: new Date(createdAt),
        confidenceScore: 0.9,
        riskLevel: 'low',
      });
    }
  }

  messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return messages;
}
