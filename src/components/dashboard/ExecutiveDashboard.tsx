import { AgentsSidebar } from './AgentsSidebar';
import { CommandCenter } from './CommandCenter';
import { DecisionCenter } from './DecisionCenter';
import { BusinessContext } from './BusinessContext';
import { EventTimeline } from './EventTimeline';
import { InternalCRM } from './InternalCRM';
import { DocumentsPanel } from './DocumentsPanel';
import { WorkflowsPanel } from './WorkflowsPanel';
import { IntegrationsPanel } from './IntegrationsPanel';
import { DashboardHeader } from './DashboardHeader';
import { ActionPipelinePanel } from './ActionPipelinePanel';
import { AuditLogPanel } from './AuditLogPanel';
import { KillSwitchControl } from './KillSwitchControl';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ExecutiveDashboard() {
  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Top Header */}
      <DashboardHeader />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - AI Agents */}
        <aside className="w-72 shrink-0 border-r border-border">
          <AgentsSidebar />
        </aside>

        {/* Center - Command Center */}
        <main className="flex-1 flex flex-col min-w-0">
          <CommandCenter className="flex-1 panel m-2 mr-1" />
        </main>

        {/* Right Sidebar - Business Panels */}
        <aside className="w-[420px] shrink-0 border-l border-border">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {/* Kill Switch */}
              <KillSwitchControl />

              {/* Business Context */}
              <BusinessContext />

              {/* Action Pipeline */}
              <ActionPipelinePanel />

              {/* Decision Center */}
              <DecisionCenter />

              {/* Audit Log */}
              <AuditLogPanel />

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
    </div>
  );
}
