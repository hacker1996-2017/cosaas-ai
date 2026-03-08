import { useState } from 'react';
import { 
  ShieldCheck, GitBranch, Building2, Clock, MessageSquare, 
  BarChart3, FileText, PanelRightClose, PanelRightOpen, Calendar, Users, LineChart 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';

const tabs = [
  { id: 'control', icon: ShieldCheck, label: 'Control', indices: [0, 3] },
  { id: 'pipeline', icon: GitBranch, label: 'Pipeline', indices: [2] },
  { id: 'overview', icon: Building2, label: 'Overview', indices: [1] },
  { id: 'activity', icon: Clock, label: 'Activity', indices: [5, 4] },
  { id: 'comms', icon: MessageSquare, label: 'Comms', indices: [6] },
  { id: 'crm', icon: BarChart3, label: 'CRM', indices: [7] },
  { id: 'reports', icon: LineChart, label: 'Reports', indices: [13] },
  { id: 'docs', icon: FileText, label: 'Docs', indices: [8, 9, 10] },
  { id: 'scheduler', icon: Calendar, label: 'Scheduler', indices: [11] },
  { id: 'team', icon: Users, label: 'Team', indices: [12] },
] as const;
interface RightPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function RightPanel({ children, className }: RightPanelProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('control');
  const [collapsed, setCollapsed] = useState(false);

  const childArray = Array.isArray(children) ? children : [children];
  const activeTabConfig = tabs.find(t => t.id === activeTab) || tabs[0];
  const visibleChildren = activeTabConfig.indices.map(i => childArray[i]).filter(Boolean);

  // Mobile: sheet drawer
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg"
          >
            <PanelRightOpen className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[92vw] max-w-[440px] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">{visibleChildren}</div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: collapsible tabbed panel
  return (
    <aside
      className={cn(
        'relative flex flex-col min-w-0 w-full overflow-hidden border-l border-border/50 transition-all duration-300',
        collapsed && 'max-w-[2.5rem]',
        className
      )}
    >
      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed(c => !c)}
        className={cn(
          'absolute top-2 z-10 h-7 w-7 text-muted-foreground hover:text-foreground',
          collapsed ? 'left-1' : 'right-2'
        )}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? <PanelRightOpen className="h-3.5 w-3.5" /> : <PanelRightClose className="h-3.5 w-3.5" />}
      </Button>

      {!collapsed && (
        <>
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          <ScrollArea className="flex-1 min-w-0">
            <div className="p-3 space-y-3 min-w-0">{visibleChildren}</div>
          </ScrollArea>
        </>
      )}
    </aside>
  );
}

function TabBar({ activeTab, onTabChange }: { activeTab: string; onTabChange: (id: string) => void }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5 px-2 py-2 border-b border-border/40 bg-background/50 backdrop-blur-sm shrink-0">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-primary/15 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="lg:hidden">
                <p>{tab.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
