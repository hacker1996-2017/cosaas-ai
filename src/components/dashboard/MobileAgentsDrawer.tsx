import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AgentsSidebar } from './AgentsSidebar';

interface MobileAgentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileAgentsDrawer({ open, onOpenChange }: MobileAgentsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0 overflow-hidden">
        <AgentsSidebar />
      </SheetContent>
    </Sheet>
  );
}
