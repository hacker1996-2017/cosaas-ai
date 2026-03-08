import { Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type AutonomyLevel = Database['public']['Enums']['autonomy_level'];

interface AutonomyControlProps {
  value: AutonomyLevel;
  onChange: (level: AutonomyLevel) => void;
  disabled?: boolean;
}

const autonomyLevels: { level: AutonomyLevel; label: string; short: string; description: string }[] = [
  { level: 'observe_only', label: 'Observe Only', short: 'OBS', description: 'AI only reads data' },
  { level: 'recommend', label: 'Recommend', short: 'REC', description: 'AI recommends, CEO approves' },
  { level: 'draft_actions', label: 'Draft Actions', short: 'DFT', description: 'AI drafts for approval' },
  { level: 'execute_with_approval', label: 'Exec + Approval', short: 'E+A', description: 'Auto-execute low risk' },
  { level: 'execute_autonomous', label: 'Full Autonomous', short: 'AUT', description: 'AI executes autonomously' },
];

export function AutonomyControl({ value, onChange, disabled }: AutonomyControlProps) {
  const currentIndex = autonomyLevels.findIndex((l) => l.level === value);
  const currentLevel = autonomyLevels[currentIndex >= 0 ? currentIndex : 2];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Autonomy</h3>
        {disabled && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>
      
      {/* Level Bar */}
      <div className="flex gap-0.5">
        {autonomyLevels.map((level, index) => (
          <button
            key={level.level}
            onClick={() => !disabled && onChange(level.level)}
            disabled={disabled}
            className={cn(
              'flex-1 h-1.5 rounded-full transition-all duration-300',
              index <= currentIndex
                ? 'bg-primary'
                : 'bg-secondary/60',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={level.label}
          />
        ))}
      </div>

      {/* Current Level */}
      <div className="text-center space-y-0.5">
        <p className="text-[11px] font-semibold text-primary">{currentLevel.label}</p>
        <p className="text-[10px] text-muted-foreground">{currentLevel.description}</p>
      </div>

      {/* Level Pills */}
      <div className="grid grid-cols-5 gap-1">
        {autonomyLevels.map((level) => (
          <button
            key={level.level}
            onClick={() => !disabled && onChange(level.level)}
            disabled={disabled}
            className={cn(
              'py-1 text-[9px] font-semibold rounded transition-all duration-200 text-center',
              level.level === value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/60',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {level.short}
          </button>
        ))}
      </div>
    </div>
  );
}
