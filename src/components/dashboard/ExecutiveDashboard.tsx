import { AgentsSidebar } from './AgentsSidebar';
import { CommandCenter } from './CommandCenter';
import { DecisionCenter } from './DecisionCenter';
import { IndustryPanel } from './IndustryPanel';
import { EventTimeline } from './EventTimeline';
import { InternalCRM } from './InternalCRM';
import { DocumentsPanel } from './DocumentsPanel';
import { WorkflowsPanel } from './WorkflowsPanel';
import { IntegrationsPanel } from './IntegrationsPanel';
import { DashboardHeader } from './DashboardHeader';
import { ActionPipelinePanel } from './ActionPipelinePanel';
import { AuditLogPanel } from './AuditLogPanel';
import { KillSwitchControl } from './KillSwitchControl';
import { CommunicationsPanel } from './CommunicationsPanel';
import { LeftSidebar } from './layout/LeftSidebar';
import { MainCommandCenter } from './layout/MainCommandCenter';
import { RightPanel } from './layout/RightPanel';

export function ExecutiveDashboard() {
  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      {/* Top Header */}
      <DashboardHeader />

      {/* Main Content - flex row, all children constrained */}
      <div className="flex flex-1 overflow-hidden min-w-0">
        {/* Left Sidebar - AI Agents */}
        <LeftSidebar>
          <AgentsSidebar />
        </LeftSidebar>

        {/* Center - Command Center */}
        <MainCommandCenter>
          <CommandCenter className="flex-1 panel m-2" />
        </MainCommandCenter>

        {/* Right Sidebar - Business Panels */}
        <RightPanel>
          <KillSwitchControl />
          <IndustryPanel />
          <ActionPipelinePanel />
          <DecisionCenter />
          <AuditLogPanel />
          <EventTimeline />
          <CommunicationsPanel />
          <InternalCRM />
          <DocumentsPanel />
          <WorkflowsPanel />
          <IntegrationsPanel />
        </RightPanel>
      </div>
    </div>
  );
}
