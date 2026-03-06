import { cn } from '@/lib/utils';

interface MainCommandCenterProps {
  children: React.ReactNode;
  className?: string;
}

export function MainCommandCenter({ children, className }: MainCommandCenterProps) {
  return (
    <main className={cn('flex flex-col min-w-0 w-full overflow-hidden', className)}>
      {children}
    </main>
  );
}
