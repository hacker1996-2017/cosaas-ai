import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Loader2, Bot } from 'lucide-react';
import { useClientChat } from '@/hooks/useClientChat';
import { ChatMessageBubble } from './ChatMessageBubble';
import { ChatTypingIndicator } from './ChatTypingIndicator';
import { ChatStartScreen } from './ChatStartScreen';

interface ClientChatWidgetProps {
  organizationId: string;
  orgName?: string;
}

export function ClientChatWidget({ organizationId, orgName }: ClientChatWidgetProps) {
  const { messages, isLoading, isSending, sendMessage } = useClientChat(organizationId);
  const [input, setInput] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [started, setStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  useEffect(() => {
    if (started && inputRef.current) {
      inputRef.current.focus();
    }
  }, [started]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text, name || 'Visitor', email || undefined);
  };

  if (!started) {
    return (
      <ChatStartScreen
        orgName={orgName}
        name={name}
        email={email}
        onNameChange={setName}
        onEmailChange={setEmail}
        onStart={() => setStarted(true)}
      />
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, hsl(222 47% 6%) 0%, hsl(220 40% 12%) 100%)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b border-white/10"
        style={{ background: 'hsl(220 40% 10%)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(260 80% 60%) 100%)' }}
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-bold" style={{ color: 'hsl(220 20% 93%)' }}>
            {orgName || 'AI Support'}
          </h2>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(152 60% 48%)' }} />
            <p className="text-[11px] font-medium" style={{ color: 'hsl(152 60% 48%)' }}>
              AI Online · Responds instantly
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(217 91% 60%)' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'hsl(222 35% 16%)', border: '1px solid hsl(220 20% 20%)' }}
            >
              <Bot className="w-7 h-7" style={{ color: 'hsl(217 91% 60%)' }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'hsl(220 20% 80%)' }}>
              Hi {name}! 👋
            </p>
            <p className="text-xs" style={{ color: 'hsl(220 12% 50%)' }}>
              Send a message and our AI will respond instantly.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} clientName={name} />
          ))
        )}
        {isSending && <ChatTypingIndicator />}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10" style={{ background: 'hsl(220 40% 10%)' }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 rounded-xl text-sm border border-white/10 focus:border-blue-500/40 focus:outline-none transition-colors"
            style={{ background: 'hsl(222 35% 14%)', color: 'hsl(220 20% 93%)' }}
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 hover:opacity-90"
            style={{
              background: input.trim()
                ? 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(260 80% 60%) 100%)'
                : 'hsl(222 35% 18%)',
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
        <p className="text-[10px] text-center mt-2" style={{ color: 'hsl(220 10% 35%)' }}>
          Powered by AI · Responses are generated automatically
        </p>
      </div>
    </div>
  );
}
