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
import { AgentSchedulerPanel } from './AgentSchedulerPanel';
import { UserManagementPanel } from './UserManagementPanel';
import { ReportingDashboard } from './ReportingDashboard';
import { LeftSidebar } from './layout/LeftSidebar';
import { MainCommandCenter } from './layout/MainCommandCenter';
import { RightPanel } from './layout/RightPanel';

export function ExecutiveDashboard() {
  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      <DashboardHeader />

      <div className="flex md:grid md:grid-cols-[220px_1fr_minmax(320px,420px)] flex-1 overflow-hidden min-w-0 w-full">
        <LeftSidebar>
          <AgentsSidebar />
        </LeftSidebar>

        <MainCommandCenter>
          <CommandCenter className="flex-1 panel m-2" />
        </MainCommandCenter>

        {/* Right panel children indexed by position:
            0: KillSwitch, 1: Industry, 2: ActionPipeline, 3: DecisionCenter,
            4: AuditLog, 5: EventTimeline, 6: Communications, 7: CRM,
            8: Documents, 9: Workflows, 10: Integrations, 11: Scheduler, 12: Team, 13: Reports */}
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
          <AgentSchedulerPanel />
          <UserManagementPanel />
          <ReportingDashboard />
        </RightPanel>
      </div>
    </div>
  );
}
