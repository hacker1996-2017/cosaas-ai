import { Loader2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type AutonomyLevel = Database['public']['Enums']['autonomy_level'];

interface AutonomyControlProps {
  value: AutonomyLevel;
  onChange: (level: AutonomyLevel) => void;
  disabled?: boolean;
}

const autonomyLevels: { level: AutonomyLevel; label: string; description: string }[] = [
  { level: 'observe_only', label: 'Observe Only', description: 'AI only reads data, makes no changes' },
  { level: 'recommend', label: 'Recommend', description: 'AI makes recommendations, CEO approves all' },
  { level: 'draft_actions', label: 'Draft Actions', description: 'AI drafts actions for CEO approval' },
  { level: 'execute_with_approval', label: 'Execute w/ Approval', description: 'AI auto-executes low risk, drafts high risk' },
  { level: 'execute_autonomous', label: 'Full Autonomous', description: 'AI executes most things autonomously' },
];

export function AutonomyControl({ value, onChange, disabled }: AutonomyControlProps) {
  const currentIndex = autonomyLevels.findIndex((l) => l.level === value);
  const currentLevel = autonomyLevels[currentIndex >= 0 ? currentIndex : 2]; // Default to draft_actions

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Autonomy Control</h3>
        {disabled && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>
      
      {/* Level Buttons */}
      <div className="grid grid-cols-5 gap-1">
        {autonomyLevels.map((level, index) => (
          <button
            key={level.level}
            onClick={() => !disabled && onChange(level.level)}
            disabled={disabled}
            className={cn(
              'h-2 rounded-full transition-all',
              index <= currentIndex
                ? 'bg-primary'
                : 'bg-secondary hover:bg-secondary/80',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            title={level.label}
          />
        ))}
      </div>

      {/* Current Level Label */}
      <div className="text-center">
        <p className="text-xs font-medium text-primary">{currentLevel.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{currentLevel.description}</p>
      </div>

      {/* Level Selector Pills */}
      <div className="flex flex-wrap gap-1">
        {autonomyLevels.map((level) => (
          <button
            key={level.level}
            onClick={() => !disabled && onChange(level.level)}
            disabled={disabled}
            className={cn(
              'px-2 py-1 text-xs rounded-md transition-all',
              level.level === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {level.label.split(' ')[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
