import { AgentsSidebar } from './AgentsSidebar';
import { CommandCenter } from './CommandCenter';
import { DecisionCenter } from './DecisionCenter';
import { BusinessContext } from './BusinessContext';
import { EventTimeline } from './EventTimeline';
import { InternalCRM } from './InternalCRM';
import { DocumentsPanel } from './DocumentsPanel';
import { WorkflowsPanel } from './WorkflowsPanel';
import { IntegrationsPanel } from './IntegrationsPanel';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ExecutiveDashboard() {
  return (
    <div className="flex h-screen w-full bg-background">
      {/* Left Sidebar - AI Agents */}
      <aside className="w-72 shrink-0 border-r border-border">
        <AgentsSidebar />
      </aside>

      {/* Center - Command Center */}
      <main className="flex-1 flex flex-col min-w-0">
        <CommandCenter className="flex-1 panel m-2 mr-1" />
      </main>

      {/* Right Sidebar - Business Panels */}
      <aside className="w-96 shrink-0 border-l border-border">
        <ScrollArea className="h-screen">
          <div className="p-2 space-y-2">
            {/* Business Context */}
            <BusinessContext />

            {/* Decision Center */}
            <DecisionCenter />

            {/* Event Timeline */}
            <EventTimeline />

            {/* Internal CRM */}
            <InternalCRM />

            {/* Documents */}
            <DocumentsPanel />

            {/* Workflows */}
            <WorkflowsPanel />

            {/* Integrations */}
            <IntegrationsPanel />
          </div>
        </ScrollArea>
      </aside>
    </div>
  );
}
