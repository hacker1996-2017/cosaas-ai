import { useState, useEffect } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

const STORAGE_KEY = 'exec-right-panel-collapsed';

interface RightPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function RightPanel({ children, className }: RightPanelProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {}
  }, [collapsed]);

  // Mobile: use a Sheet drawer
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
        <SheetContent side="right" className="w-[90vw] max-w-[420px] p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3 break-words">{children}</div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: collapsible side panel — constrained to its grid column
  return (
    <aside
      className={cn(
        'relative flex flex-col min-w-0 w-full overflow-hidden border-l border-border transition-all duration-300',
        collapsed && 'max-w-[2.5rem]',
        className
      )}
    >
      {/* Toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setCollapsed((c) => !c)}
        className="absolute top-2 left-1.5 z-10 h-8 w-8 text-muted-foreground hover:text-foreground"
        title={collapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
      </Button>

      {/* Panel content */}
      {!collapsed && (
        <ScrollArea className="h-full flex-1 min-w-0">
          <div className="p-3 pt-10 space-y-2 min-w-0 overflow-hidden">{children}</div>
        </ScrollArea>
      )}
    </aside>
  );
}
