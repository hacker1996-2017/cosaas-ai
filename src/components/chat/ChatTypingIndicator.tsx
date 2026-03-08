export function ChatTypingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mr-2 mt-1 shrink-0"
        style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(260 80% 60%) 100%)' }}
      >
        <span className="text-xs">🤖</span>
      </div>
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-md"
        style={{ background: 'hsl(222 35% 16%)', border: '1px solid hsl(220 20% 20%)' }}
      >
        <div className="flex gap-1.5 items-center">
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(217 91% 60%)', animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(217 91% 60%)', animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: 'hsl(217 91% 60%)', animationDelay: '300ms' }} />
          <span className="text-[10px] ml-2" style={{ color: 'hsl(220 10% 50%)' }}>AI is thinking…</span>
        </div>
      </div>
    </div>
  );
}
