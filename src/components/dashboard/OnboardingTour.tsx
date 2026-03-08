import { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, Sparkles, MessageSquare, Bot, GitBranch, ShieldCheck, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOUR_STORAGE_KEY = 'cos-ai-onboarding-complete';

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  accentColor: string;
  tip: string;
}

const tourSteps: TourStep[] = [
  {
    title: 'Welcome to Chief of Staff AI',
    description: 'Your AI-powered executive operating system. Issue natural-language commands and let your AI agents handle the execution.',
    icon: Sparkles,
    accentColor: 'hsl(var(--gold))',
    tip: 'Think of this as your digital chief of staff — always on, always learning.',
  },
  {
    title: 'Command Center',
    description: 'The central hub where you issue directives. Type commands like "Send a follow-up to all at-risk clients" and watch your AI workforce execute.',
    icon: MessageSquare,
    accentColor: 'hsl(var(--primary))',
    tip: 'Use ⌘K to quickly search commands, clients, and decisions.',
  },
  {
    title: 'AI Agent Fleet',
    description: 'Your autonomous agents handle email, CRM, scheduling, and more. Each has specialized skills and operates within the autonomy level you set.',
    icon: Bot,
    accentColor: 'hsl(var(--accent-success))',
    tip: 'Click any agent card to view its instructions, active tasks, and performance.',
  },
  {
    title: 'Action Pipeline',
    description: 'Every AI action flows through a governed pipeline. Review, approve, or reject actions before they execute — full human-in-the-loop control.',
    icon: GitBranch,
    accentColor: 'hsl(var(--accent-warning))',
    tip: 'High-risk actions always require your explicit approval.',
  },
  {
    title: 'Kill Switch & Governance',
    description: 'You have absolute control. The Kill Switch instantly halts all AI operations. Set autonomy levels from supervised to fully autonomous.',
    icon: ShieldCheck,
    accentColor: 'hsl(var(--accent-danger))',
    tip: 'The quota bar in the header shows real-time AI action limits.',
  },
  {
    title: 'Reports & Intelligence',
    description: 'AI-powered health scoring, CSV/PDF exports, and real-time analytics. Get executive-ready insights at a glance.',
    icon: BarChart3,
    accentColor: 'hsl(var(--primary-glow))',
    tip: 'Use the Score button in Reports to trigger AI health analysis.',
  },
];

export function OnboardingTour() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setIsVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setIsVisible(false);
  }, []);

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  if (!isVisible) return null;

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;
  const isLast = currentStep === tourSteps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={completeTour}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-md rounded-2xl border border-border/60 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        style={{
          background: 'linear-gradient(168deg, hsl(var(--bg-panel)) 0%, hsl(var(--bg-dark)) 100%)',
          boxShadow: `0 24px 64px -12px hsl(0 0% 0% / 0.6), 0 0 40px -8px ${step.accentColor}20`,
        }}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-border/30">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${step.accentColor}, ${step.accentColor}80)`,
            }}
          />
        </div>

        {/* Close */}
        <button
          onClick={completeTour}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          {/* Icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{
              background: `linear-gradient(135deg, ${step.accentColor}20, ${step.accentColor}05)`,
              border: `1px solid ${step.accentColor}30`,
              boxShadow: `0 0 24px -4px ${step.accentColor}20`,
            }}
          >
            <Icon className="w-7 h-7" style={{ color: step.accentColor }} />
          </div>

          {/* Step counter */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: step.accentColor }}
            >
              Step {currentStep + 1} of {tourSteps.length}
            </span>
          </div>

          <h2 className="text-lg font-bold text-foreground mb-2">{step.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Tip */}
          <div
            className="rounded-lg p-3 mb-6"
            style={{
              background: `${step.accentColor}08`,
              border: `1px solid ${step.accentColor}15`,
            }}
          >
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold" style={{ color: step.accentColor }}>💡 Tip: </span>
              {step.tip}
            </p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {tourSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={cn(
                  'rounded-full transition-all duration-300',
                  i === currentStep
                    ? 'w-6 h-1.5'
                    : 'w-1.5 h-1.5 bg-border hover:bg-muted-foreground/40'
                )}
                style={i === currentStep ? { background: step.accentColor } : undefined}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={prevStep}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={completeTour}
              className="text-muted-foreground hover:text-foreground"
            >
              Skip tour
            </Button>
            <Button
              size="sm"
              onClick={nextStep}
              className="min-w-[100px]"
              style={{
                background: `linear-gradient(135deg, ${step.accentColor}, ${step.accentColor}cc)`,
                color: 'hsl(var(--primary-foreground))',
              }}
            >
              {isLast ? 'Get Started' : 'Next'}
              {!isLast && <ArrowRight className="w-3.5 h-3.5 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
