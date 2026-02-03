import { AutonomyLevel } from '@/types/executive';
import { cn } from '@/lib/utils';

interface AutonomyControlProps {
  value: AutonomyLevel;
  onChange: (level: AutonomyLevel) => void;
}

const autonomyLevels: { level: AutonomyLevel; label: string; description: string }[] = [
  { level: 'observe_only', label: 'Observe Only', description: 'AI only reads data, makes no changes' },
  { level: 'recommend', label: 'Recommend', description: 'AI makes recommendations, CEO approves all' },
  { level: 'draft_actions', label: 'Draft Actions', description: 'AI drafts actions for CEO approval' },
  { level: 'execute_with_approval', label: 'Execute w/ Approval', description: 'AI auto-executes low risk, drafts high risk' },
  { level: 'execute_autonomous', label: 'Full Autonomous', description: 'AI executes most things autonomously' },
];

export function AutonomyControl({ value, onChange }: AutonomyControlProps) {
  const currentIndex = autonomyLevels.findIndex((l) => l.level === value);
  const currentLevel = autonomyLevels[currentIndex];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Autonomy Control</h3>
      
      {/* Level Buttons */}
      <div className="grid grid-cols-5 gap-1">
        {autonomyLevels.map((level, index) => (
          <button
            key={level.level}
            onClick={() => onChange(level.level)}
            className={cn(
              'h-2 rounded-full transition-all',
              index <= currentIndex
                ? 'bg-primary'
                : 'bg-secondary hover:bg-secondary/80'
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
            onClick={() => onChange(level.level)}
            className={cn(
              'px-2 py-1 text-xs rounded-md transition-all',
              level.level === value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {level.label.split(' ')[0]}
          </button>
        ))}
      </div>
    </div>
  );
}
