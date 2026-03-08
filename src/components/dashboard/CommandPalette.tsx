import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import {
  Search, Users, MessageSquare, Scale, Zap, FileText, Settings, BarChart3, Shield, Clock,
} from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useCommands } from '@/hooks/useCommands';
import { useDecisions } from '@/hooks/useDecisions';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { clients } = useClients();
  const { commands } = useCommands();
  const { decisions } = useDecisions();
  const [search, setSearch] = useState('');

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filteredClients = useMemo(() => {
    if (!search) return clients.slice(0, 5);
    const s = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(s) ||
      c.company?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s)
    ).slice(0, 8);
  }, [clients, search]);

  const filteredCommands = useMemo(() => {
    if (!search) return commands.slice(0, 5);
    const s = search.toLowerCase();
    return commands.filter(c =>
      c.command_text.toLowerCase().includes(s)
    ).slice(0, 8);
  }, [commands, search]);

  const filteredDecisions = useMemo(() => {
    if (!search) return decisions.filter(d => d.status === 'pending').slice(0, 5);
    const s = search.toLowerCase();
    return decisions.filter(d =>
      d.title.toLowerCase().includes(s) ||
      d.description?.toLowerCase().includes(s)
    ).slice(0, 8);
  }, [decisions, search]);

  const quickActions = [
    { label: 'Settings', icon: Settings, action: () => navigate('/settings') },
    { label: 'View Reports', icon: BarChart3, action: () => onOpenChange(false) },
  ];

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'completed': return 'text-[hsl(var(--accent-success))]';
      case 'in_progress': return 'text-primary';
      case 'failed': return 'text-destructive';
      case 'pending': return 'text-[hsl(var(--accent-warning))]';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search clients, commands, decisions..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Quick Actions */}
        {!search && (
          <CommandGroup heading="Quick Actions">
            {quickActions.map(a => (
              <CommandItem key={a.label} onSelect={() => { a.action(); onOpenChange(false); }}>
                <a.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{a.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Pending Decisions */}
        {filteredDecisions.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Decisions">
              {filteredDecisions.map(d => (
                <CommandItem key={d.id} onSelect={() => onOpenChange(false)}>
                  <Scale className="mr-2 h-4 w-4 text-[hsl(var(--accent-warning))]" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm">{d.title}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {d.risk_level} risk • {d.status}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Clients */}
        {filteredClients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clients">
              {filteredClients.map(c => (
                <CommandItem key={c.id} onSelect={() => onOpenChange(false)}>
                  <Users className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {c.company || 'No company'} • ${(Number(c.mrr) || 0).toLocaleString()}/mo
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Commands */}
        {filteredCommands.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Commands">
              {filteredCommands.map(c => (
                <CommandItem key={c.id} onSelect={() => onOpenChange(false)}>
                  <Zap className={`mr-2 h-4 w-4 ${getStatusColor(c.status)}`} />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm">{c.command_text}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {c.status} • {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
