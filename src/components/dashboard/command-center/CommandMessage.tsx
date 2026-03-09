import { cn } from '@/lib/utils';
import { Check, Clock, Loader2, AlertTriangle, ChevronRight, FileText, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';

interface ExecutionStep {
  label: string;
  status: string;
  detail?: string;
}

interface CommandResult {
  ai_message?: string;
  ai_message_type?: string;
  awaiting_clarification?: boolean;
  clarification_question?: string;
  clarification_options?: string[];
  execution_steps?: ExecutionStep[];
  execution_result?: Record<string, unknown>;
  report_content?: string;
  report_stats?: Record<string, unknown>;
  evidence_collected?: boolean;
  duration_ms?: number;
  decision_id?: string;
  decision_title?: string;
  action_pipeline_id?: string;
  user_clarification?: string;
}

interface CommandMessageProps {
  role: 'ceo' | 'ai';
  content: string;
  timestamp: Date;
  status?: string;
  commandStatus?: string;
  result?: CommandResult | null;
  confidenceScore?: number;
  riskLevel?: string;
  onClarificationReply?: (reply: string) => void;
  isReplying?: boolean;
}

export function CommandMessage({
  role,
  content,
  timestamp,
  commandStatus,
  result,
  confidenceScore,
  riskLevel,
  onClarificationReply,
  isReplying,
}: CommandMessageProps) {
  const isAI = role === 'ai';
  const hasRichResponse = isAI && result?.ai_message;
  const isClarification = result?.awaiting_clarification && result?.clarification_options;

  return (
    <div className={cn('flex flex-col animate-fade-in gap-1', isAI ? 'items-start' : 'items-end')}>
      {/* Main message bubble */}
      <div className={cn('chat-bubble max-w-[90%]', role === 'ceo' ? 'ceo' : 'ai')}>
        {hasRichResponse ? (
          <div className="prose prose-sm prose-invert max-w-none [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_p]:text-xs [&_p]:leading-relaxed [&_li]:text-xs [&_ul]:my-1 [&_ol]:my-1 [&_strong]:text-primary [&_hr]:my-2 [&_hr]:border-border/30">
            <ReactMarkdown>{result.ai_message!}</ReactMarkdown>
          </div>
        ) : (
          <span className="text-xs leading-relaxed">{content}</span>
        )}
      </div>

      {/* Execution Steps */}
      {isAI && result?.execution_steps && result.execution_steps.length > 0 && (
        <div className="ml-2 mt-1 space-y-0.5 max-w-[85%]">
          {result.execution_steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              {step.status === 'done' ? (
                <Check className="w-3 h-3 text-green-400 shrink-0" />
              ) : step.status === 'in_progress' ? (
                <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
              ) : step.status === 'failed' ? (
                <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
              ) : (
                <Clock className="w-3 h-3 text-muted-foreground/50 shrink-0" />
              )}
              <span className={cn(
                'font-mono',
                step.status === 'done' ? 'text-green-400/80' :
                step.status === 'in_progress' ? 'text-primary' :
                step.status === 'failed' ? 'text-destructive' :
                'text-muted-foreground/50'
              )}>
                {step.label}
              </span>
              {step.detail && (
                <span className="text-muted-foreground/40 truncate">— {step.detail}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Report content (expandable) */}
      {isAI && result?.report_content && (
        <details className="ml-2 mt-1.5 max-w-[90%] group">
          <summary className="flex items-center gap-1.5 text-[10px] text-primary cursor-pointer hover:text-primary/80 transition-colors">
            <FileText className="w-3 h-3" />
            <span className="font-medium">View Full Report</span>
            <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90" />
          </summary>
          <div className="mt-1.5 p-3 rounded-lg bg-secondary/30 border border-border/20 prose prose-sm prose-invert max-w-none [&_p]:text-[11px] [&_li]:text-[11px] [&_h1]:text-xs [&_h2]:text-[11px] [&_h3]:text-[11px] [&_strong]:text-primary">
            <ReactMarkdown>{result.report_content}</ReactMarkdown>
          </div>
        </details>
      )}

      {/* Clarification options */}
      {isClarification && onClarificationReply && (
        <div className="ml-2 mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
          {result.clarification_options!.map((option, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              disabled={isReplying}
              onClick={() => onClarificationReply(option)}
              className="h-7 text-[11px] px-3 border-primary/20 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all group"
            >
              {option}
              <ArrowRight className="w-2.5 h-2.5 ml-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Button>
          ))}
        </div>
      )}

      {/* Meta info */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] text-muted-foreground font-mono">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {confidenceScore != null && isAI && (
          <span className="text-[10px] text-primary font-medium">
            {Math.round(confidenceScore * 100)}%
          </span>
        )}
        {riskLevel && isAI && (
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-medium',
            riskLevel === 'low' && 'badge-success',
            riskLevel === 'medium' && 'badge-warning',
            (riskLevel === 'high' || riskLevel === 'critical') && 'badge-danger',
          )}>
            {riskLevel}
          </span>
        )}
        {result?.evidence_collected && (
          <span className="text-[10px] text-green-400/70 font-mono">✓ evidence</span>
        )}
        {result?.duration_ms && (
          <span className="text-[10px] text-muted-foreground/60 font-mono">{result.duration_ms}ms</span>
        )}
      </div>
    </div>
  );
}
