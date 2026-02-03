import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Sparkles } from 'lucide-react';
import { ChatMessage } from '@/types/executive';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Mock initial messages
const initialMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'ai',
    content: 'Good morning. I am fully synchronized with company objectives, active risks, and prior executive decisions. How would you like to proceed?',
    timestamp: new Date(Date.now() - 60000),
    confidenceScore: 0.98,
  },
];

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
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'ceo',
      content: input,
      timestamp: new Date(),
      status: 'sent',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `Understood. I'm processing your request: "${input}". Initiating workflow analysis and coordinating with relevant agents. You'll receive real-time updates as actions are executed.`,
        timestamp: new Date(),
        confidenceScore: 0.92,
        riskLevel: 'low',
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
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
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
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
                      message.riskLevel === 'high' && 'badge-danger'
                    )}
                  >
                    {message.riskLevel} risk
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
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
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Speak or type your command as CEO..."
              className="pr-10 bg-secondary border-0 focus-visible:ring-primary"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={handleSend} size="icon" className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
