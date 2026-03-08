import { useState } from 'react';
import {
  MessageSquare, Bot, GitBranch, BarChart3, MoreHorizontal,
  ShieldCheck, FileText, Users, Calendar, LineChart, Building2, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

const primaryTabs = [
  { id: 'command', icon: MessageSquare, label: 'Command' },
  { id: 'agents', icon: Bot, label: 'Agents' },
  { id: 'pipeline', icon: GitBranch, label: 'Pipeline' },
  { id: 'crm', icon: BarChart3, label: 'CRM' },
  { id: 'more', icon: MoreHorizontal, label: 'More' },
] as const;

const moreTabs = [
  { id: 'control', icon: ShieldCheck, label: 'Control' },
  { id: 'overview', icon: Building2, label: 'Overview' },
  { id: 'activity', icon: Clock, label: 'Activity' },
  { id: 'comms', icon: MessageSquare, label: 'Comms' },
  { id: 'reports', icon: LineChart, label: 'Reports' },
  { id: 'docs', icon: FileText, label: 'Docs' },
  { id: 'scheduler', icon: Calendar, label: 'Scheduler' },
  { id: 'team', icon: Users, label: 'Team' },
] as const;

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const handleTabPress = (id: string) => {
    if (id === 'more') {
      setMoreOpen(true);
      return;
    }
    onTabChange(id);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 backdrop-blur-xl safe-area-bottom"
        style={{
          background: 'linear-gradient(180deg, hsl(222 47% 8% / 0.97) 0%, hsl(222 47% 5% / 0.99) 100%)',
        }}
      >
        <div className="flex items-center justify-around h-14 px-1">
          {primaryTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabPress(tab.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-lg transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive && 'drop-shadow-[0_0_6px_hsl(217,91%,60%/0.5)]')} />
                <span className="text-[10px] font-semibold">{tab.label}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh] p-0">
          <div className="p-4 pb-2 border-b border-border/40">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground">More Panels</h3>
          </div>
          <ScrollArea className="flex-1 max-h-[45vh]">
            <div className="grid grid-cols-4 gap-2 p-4">
              {moreTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all',
                      isActive
                        ? 'bg-primary/15 text-primary border border-primary/20'
                        : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-semibold">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
