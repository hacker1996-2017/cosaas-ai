import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface LeftSidebarProps {
  children: React.ReactNode;
  className?: string;
}

export function LeftSidebar({ children, className }: LeftSidebarProps) {
  const isMobile = useIsMobile();

  if (isMobile) return null;

  return (
    <aside
      className={cn(
        'w-[clamp(200px,18vw,288px)] shrink-0 border-r border-border min-w-0 overflow-hidden',
        className
      )}
    >
      {children}
    </aside>
  );
}
