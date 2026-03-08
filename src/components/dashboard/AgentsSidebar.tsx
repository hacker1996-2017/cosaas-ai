import { useState } from 'react';
import { Loader2, AlertCircle, Settings2, Bot } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { AutonomyControl } from './AutonomyControl';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgents } from '@/hooks/useAgents';
import { useOrganization } from '@/hooks/useOrganization';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type AutonomyLevel = Database['public']['Enums']['autonomy_level'];

interface AgentsSidebarProps {
  className?: string;
}

export function AgentsSidebar({ className }: AgentsSidebarProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const { agents, isLoading: agentsLoading, error: agentsError } = useAgents();
  const { 
    organization, 
    autonomyLevel, 
    updateAutonomyLevel, 
    isLoading: orgLoading,
    isUpdating 
  } = useOrganization();

  const handleAutonomyChange = async (level: AutonomyLevel) => {
    try {
      await updateAutonomyLevel(level);
      toast.success(`Autonomy level set to ${level.replace(/_/g, ' ')}`);
    } catch (error) {
      console.error('Failed to update autonomy level:', error);
      toast.error('Failed to update autonomy level');
    }
  };

  const isLoading = agentsLoading || orgLoading;

  if (isLoading) {
    return (
      <div className={`gradient-sidebar flex flex-col h-full ${className}`}>
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Agents</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (agentsError) {
    return (
      <div className={`gradient-sidebar flex flex-col h-full ${className}`}>
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Agents</h2>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="w-6 h-6 text-destructive mb-2" />
          <p className="text-xs text-muted-foreground">Failed to load agents</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`gradient-sidebar flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">AI Agents</h2>
          </div>
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
            {agents.length}
          </span>
        </div>
        {organization && (
          <p className="text-[10px] text-muted-foreground truncate pl-6">
            {organization.name}
          </p>
        )}
      </div>

      {/* Agent Cards */}
      <ScrollArea className="flex-1 px-3 py-3">
        <div className="space-y-2">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Settings2 className="w-6 h-6 text-muted-foreground mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">No agents configured</p>
              <p className="text-[10px] text-muted-foreground mt-1 opacity-70">
                Set up your organization first
              </p>
            </div>
          ) : (
            agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isSelected={selectedAgent === agent.id}
                onClick={() => setSelectedAgent(agent.id === selectedAgent ? null : agent.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Autonomy Control */}
      <div className="p-4 border-t border-sidebar-border">
        <AutonomyControl 
          value={autonomyLevel as AutonomyLevel} 
          onChange={handleAutonomyChange}
          disabled={isUpdating}
        />
      </div>
    </div>
  );
}
