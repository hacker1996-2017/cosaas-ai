import { MessageCircle, Shield, Zap, Clock } from 'lucide-react';

interface ChatStartScreenProps {
  orgName?: string;
  name: string;
  email: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onStart: () => void;
}

export function ChatStartScreen({ orgName, name, email, onNameChange, onEmailChange, onStart }: ChatStartScreenProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, hsl(222 47% 6%) 0%, hsl(220 40% 12%) 100%)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 p-8 space-y-6"
        style={{ background: 'hsl(220 40% 10%)' }}
      >
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(260 80% 60%) 100%)' }}
          >
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(220 20% 93%)' }}>
            {orgName || 'AI Support'}
          </h1>
          <p className="text-sm" style={{ color: 'hsl(220 12% 62%)' }}>
            Get instant answers powered by AI. We typically respond in seconds.
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex justify-center gap-4">
          {[
            { icon: Zap, label: 'Instant' },
            { icon: Shield, label: 'Secure' },
            { icon: Clock, label: '24/7' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'hsl(220 12% 50%)' }}>
              <Icon className="w-3 h-3" />
              {label}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors"
            style={{ background: 'hsl(222 35% 14%)', color: 'hsl(220 20% 93%)' }}
          />
          <input
            type="email"
            placeholder="Your email (optional)"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm border border-white/10 focus:border-blue-500/50 focus:outline-none transition-colors"
            style={{ background: 'hsl(222 35% 14%)', color: 'hsl(220 20% 93%)' }}
          />
        </div>

        <button
          onClick={onStart}
          disabled={!name.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 hover:opacity-90"
          style={{
            background: name.trim()
              ? 'linear-gradient(135deg, hsl(217 91% 60%) 0%, hsl(260 80% 60%) 100%)'
              : 'hsl(222 35% 20%)',
          }}
        >
          Start Conversation
        </button>
      </div>
    </div>
  );
}
