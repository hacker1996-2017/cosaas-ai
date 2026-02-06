import { useState } from 'react';
import { Loader2, AlertCircle, Settings2 } from 'lucide-react';
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
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="text-lg font-bold text-foreground">AI EXECUTIVE AGENTS</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (agentsError) {
    return (
      <div className={`gradient-sidebar flex flex-col h-full ${className}`}>
        <div className="p-4 border-b border-sidebar-border">
          <h2 className="text-lg font-bold text-foreground">AI EXECUTIVE AGENTS</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load agents</p>
          <p className="text-xs text-muted-foreground mt-1">Please try refreshing</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`gradient-sidebar flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">AI EXECUTIVE AGENTS</h2>
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">
            {agents.length} active
          </span>
        </div>
        {organization && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {organization.name} • {organization.industry || 'General'}
          </p>
        )}
      </div>

      {/* Agent Cards */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Settings2 className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No agents configured</p>
              <p className="text-xs text-muted-foreground mt-1">
                Agents will be created during organization setup
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
