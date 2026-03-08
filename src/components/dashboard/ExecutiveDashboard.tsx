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

      {/* Main Content - desktop 3-column grid to prevent overflow */}
      <div className="flex md:grid md:grid-cols-[clamp(180px,15vw,240px)_1fr_clamp(280px,35vw,500px)] lg:grid-cols-[clamp(200px,16vw,260px)_1fr_clamp(320px,38vw,560px)] flex-1 overflow-hidden min-w-0 w-full max-w-[100vw]">
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
