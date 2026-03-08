import { Bot } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '@/hooks/useClientChat';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  clientName: string;
}

export function ChatMessageBubble({ message, clientName }: ChatMessageBubbleProps) {
  const isClient = message.sender_type === 'client';

  return (
    <div className={`flex ${isClient ? 'justify-end' : 'justify-start'}`}>
      {!isClient && (
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center mr-2 mt-1 shrink-0"
          style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(260 80% 60%) 100%)' }}
        >
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className="max-w-[78%] space-y-1">
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isClient ? 'rounded-br-md' : 'rounded-bl-md'
          }`}
          style={{
            background: isClient
              ? 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(217 100% 70%) 100%)'
              : 'hsl(222 35% 16%)',
            color: isClient ? 'white' : 'hsl(220 20% 90%)',
            border: !isClient ? '1px solid hsl(220 20% 20%)' : 'none',
          }}
        >
          {isClient ? (
            message.content
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:text-white [&_a]:text-blue-300 [&_a:hover]:text-blue-200">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1.5 px-1 ${isClient ? 'justify-end' : ''}`}>
          {!isClient && (
            <span className="text-[10px] font-medium" style={{ color: 'hsl(217 91% 60%)' }}>
              AI
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'hsl(220 10% 45%)' }}>
            {message.sender_name || (isClient ? clientName : 'AI')}
            {' · '}
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
        </div>
      </div>
    </div>
  );
}
