import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCommands } from '@/hooks/useCommands';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'ceo' | 'ai';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  confidenceScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
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
  const { commands, createCommand, isCreating, stats } = useCommands();
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      content: 'Good morning. I am fully synchronized with company objectives, active risks, and prior executive decisions. How would you like to proceed?',
      timestamp: new Date(),
      confidenceScore: 0.98,
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Convert database commands to chat messages
  useEffect(() => {
    if (commands.length > 0) {
      const commandMessages: ChatMessage[] = [];
      
      commands.forEach((cmd) => {
        // Add CEO message
        commandMessages.push({
          id: `cmd-${cmd.id}`,
          role: 'ceo',
          content: cmd.command_text,
          timestamp: new Date(cmd.created_at),
          status: 'sent',
        });

        // Add AI response based on status
        if (cmd.status === 'completed') {
          commandMessages.push({
            id: `resp-${cmd.id}`,
            role: 'ai',
            content: cmd.result 
              ? `Command executed successfully. ${JSON.stringify(cmd.result)}`
              : 'Command completed successfully.',
            timestamp: cmd.completed_at ? new Date(cmd.completed_at) : new Date(cmd.created_at),
            confidenceScore: cmd.confidence_score ? Number(cmd.confidence_score) : 0.95,
            riskLevel: cmd.risk_level as ChatMessage['riskLevel'],
          });
        } else if (cmd.status === 'in_progress') {
          commandMessages.push({
            id: `resp-${cmd.id}`,
            role: 'ai',
            content: `Processing your request: "${cmd.command_text}". Initiating workflow analysis...`,
            timestamp: new Date(cmd.created_at),
            confidenceScore: 0.85,
          });
        } else if (cmd.status === 'failed') {
          commandMessages.push({
            id: `resp-${cmd.id}`,
            role: 'ai',
            content: cmd.error_message || 'Command execution failed. Please try again.',
            timestamp: new Date(cmd.created_at),
            riskLevel: 'high',
          });
        } else if (cmd.status === 'queued') {
          commandMessages.push({
            id: `resp-${cmd.id}`,
            role: 'ai',
            content: `Understood. I'm processing your request: "${cmd.command_text}". Initiating workflow analysis and coordinating with relevant agents.`,
            timestamp: new Date(cmd.created_at),
            confidenceScore: 0.92,
            riskLevel: 'low',
          });
        }
      });

      // Sort by timestamp and update local messages
      commandMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setLocalMessages((prev) => {
        // Keep welcome message and add command messages
        const welcomeMsg = prev.find((m) => m.id === 'welcome');
        return welcomeMsg ? [welcomeMsg, ...commandMessages] : commandMessages;
      });
    }
  }, [commands]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  const handleSend = async () => {
    if (!input.trim() || isCreating) return;

    const commandText = input.trim();
    setInput('');

    try {
      const result = await createCommand(commandText);
      
      if (result.aiResult?.status === 'pending_decision') {
        toast.success('Command analyzed. Decision pending your approval.');
      } else if (result.aiResult?.status === 'completed') {
        toast.success('Command executed successfully.');
      } else {
        toast.success('Command queued for processing.');
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

  const handleSuggestedCommand = (command: string) => {
    setInput(command);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="panel-header flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>Command Center</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {stats.active > 0 && (
            <span className="badge-warning px-2 py-0.5 rounded">{stats.active} active</span>
          )}
          {stats.queued > 0 && (
            <span className="badge-info px-2 py-0.5 rounded">{stats.queued} queued</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {localMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                'flex flex-col animate-fade-in',
                message.role === 'ceo' ? 'items-end' : 'items-start'
              )}
            >
              <div className={cn('chat-bubble', message.role === 'ceo' ? 'ceo' : 'ai')}>
                {message.content}
              </div>
              <div className="flex items-center gap-2 mt-1 px-2">
                <span className="text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {message.confidenceScore && message.role === 'ai' && (
                  <span className="text-xs text-primary">
                    {Math.round(message.confidenceScore * 100)}% confidence
                  </span>
                )}
                {message.riskLevel && message.role === 'ai' && (
                  <span
                    className={cn(
                      'text-xs px-1.5 py-0.5 rounded',
                      message.riskLevel === 'low' && 'badge-success',
                      message.riskLevel === 'medium' && 'badge-warning',
                      message.riskLevel === 'high' && 'badge-danger',
                      message.riskLevel === 'critical' && 'badge-danger'
                    )}
                  >
                    {message.riskLevel} risk
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Creating Indicator */}
          {isCreating && (
            <div className="flex items-start animate-fade-in">
              <div className="chat-bubble ai">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-100" />
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* No Organization Warning */}
      {user && commands.length === 0 && (
        <div className="px-4 py-2 border-t border-border">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span>Complete organization setup to enable full command execution.</span>
          </div>
        </div>
      )}

      {/* Suggested Commands */}
      <div className="px-4 py-2 border-t border-border">
        <div className="flex flex-wrap gap-2">
          {suggestedCommands.map((command) => (
            <button
              key={command}
              onClick={() => handleSuggestedCommand(command)}
              className="px-3 py-1.5 text-xs rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            >
              {command}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Speak or type your command as CEO..."
              className="pr-10 bg-secondary border-0 focus-visible:ring-primary"
              disabled={isCreating}
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={handleSend} size="icon" className="shrink-0" disabled={isCreating || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
