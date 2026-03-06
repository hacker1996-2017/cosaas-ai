import { cn } from '@/lib/utils';

interface MainCommandCenterProps {
  children: React.ReactNode;
  className?: string;
}

export function MainCommandCenter({ children, className }: MainCommandCenterProps) {
  return (
    <main className={cn('flex flex-col min-w-0 overflow-hidden', className)} style={{ flex: '0 1 55%' }}>
      {children}
    </main>
  );
}
