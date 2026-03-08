import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, Loader2, Bot, User } from 'lucide-react';
import { useClientChat } from '@/hooks/useClientChat';
import { format } from 'date-fns';

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;
    const text = input.trim();
    setInput('');
    await sendMessage(text, name || 'Visitor', email || undefined);
  };

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, hsl(222 47% 6%) 0%, hsl(220 40% 12%) 100%)' }}
      >
        <div className="w-full max-w-md rounded-2xl border border-white/10 p-8 space-y-6"
          style={{ background: 'hsl(220 40% 10%)' }}
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 100% 70%) 100%)' }}
            >
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'hsl(220 20% 93%)' }}>
              {orgName || 'Support Chat'}
            </h1>
            <p className="text-sm" style={{ color: 'hsl(220 12% 62%)' }}>
              Send us a message and we'll respond right away.
            </p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors"
              style={{ background: 'hsl(222 35% 14%)', color: 'hsl(220 20% 93%)' }}
            />
            <input
              type="email"
              placeholder="Your email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors"
              style={{ background: 'hsl(222 35% 14%)', color: 'hsl(220 20% 93%)' }}
            />
          </div>

          <button
            onClick={() => setStarted(true)}
            disabled={!name.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
            style={{
              background: name.trim()
                ? 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 100% 70%) 100%)'
                : 'hsl(222 35% 20%)',
            }}
          >
            Start Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, hsl(222 47% 6%) 0%, hsl(220 40% 12%) 100%)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10"
        style={{ background: 'hsl(220 40% 10%)' }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 100% 70%) 100%)' }}
        >
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'hsl(220 20% 93%)' }}>
            {orgName || 'Support'}
          </h2>
          <p className="text-xs" style={{ color: 'hsl(152 60% 48%)' }}>● Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'hsl(217 91% 60%)' }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="w-8 h-8 mb-3" style={{ color: 'hsl(220 12% 50%)' }} />
            <p className="text-sm" style={{ color: 'hsl(220 12% 62%)' }}>
              Hi {name}! Send a message to get started.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[80%] space-y-1">
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.sender_type === 'client'
                      ? 'rounded-br-md'
                      : 'rounded-bl-md'
                  }`}
                  style={{
                    background: msg.sender_type === 'client'
                      ? 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 100% 70%) 100%)'
                      : 'hsl(222 35% 16%)',
                    color: msg.sender_type === 'client'
                      ? 'white'
                      : 'hsl(220 20% 90%)',
                    border: msg.sender_type !== 'client' ? '1px solid hsl(220 20% 20%)' : 'none',
                  }}
                >
                  {msg.content}
                </div>
                <div className={`flex items-center gap-1.5 px-1 ${msg.sender_type === 'client' ? 'justify-end' : ''}`}>
                  {msg.sender_type !== 'client' && (
                    <Bot className="w-3 h-3" style={{ color: 'hsl(217 91% 60%)' }} />
                  )}
                  <span className="text-[10px]" style={{ color: 'hsl(220 10% 45%)' }}>
                    {msg.sender_name || (msg.sender_type === 'client' ? name : 'AI')}
                    {' · '}
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        {isSending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md"
              style={{ background: 'hsl(222 35% 16%)', border: '1px solid hsl(220 20% 20%)' }}
            >
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'hsl(217 91% 60%)' }} />
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'hsl(217 91% 60%)', animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'hsl(217 91% 60%)', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10" style={{ background: 'hsl(220 40% 10%)' }}>
        <div className="flex items-center gap-2">
          <input
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
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
            style={{
              background: input.trim()
                ? 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 100% 70%) 100%)'
                : 'hsl(222 35% 18%)',
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}