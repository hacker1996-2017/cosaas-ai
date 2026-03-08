import { useState } from 'react';
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
import { MobileBottomNav } from './MobileBottomNav';
import { MobileAgentsDrawer } from './MobileAgentsDrawer';
import { OnboardingTour } from './OnboardingTour';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

// Map mobile tab IDs to the right-panel content they should show
const mobileTabPanelMap: Record<string, string[]> = {
  pipeline: ['pipeline'],
  crm: ['crm'],
  control: ['control'],
  overview: ['overview'],
  activity: ['activity'],
  comms: ['comms'],
  reports: ['reports'],
  docs: ['docs'],
  scheduler: ['scheduler'],
  team: ['team'],
};

export function ExecutiveDashboard() {
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState('command');
  const [agentsDrawerOpen, setAgentsDrawerOpen] = useState(false);

  const handleMobileTabChange = (tab: string) => {
    if (tab === 'agents') {
      setAgentsDrawerOpen(true);
      return;
    }
    setMobileTab(tab);
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
        <DashboardHeader />
        <OnboardingTour />

        <div className="flex-1 overflow-hidden pb-14">
          {mobileTab === 'command' && (
            <CommandCenter className="h-full" />
          )}
          {mobileTab === 'pipeline' && (
            <ScrollArea className="h-full"><div className="p-3 space-y-3"><ActionPipelinePanel /></div></ScrollArea>
          )}
          {mobileTab === 'crm' && (
            <ScrollArea className="h-full"><div className="p-3 space-y-3"><InternalCRM /></div></ScrollArea>
          )}
          {mobileTab === 'control' && (
            <ScrollArea className="h-full"><div className="p-3 space-y-3"><KillSwitchControl /><DecisionCenter /></div></ScrollArea>
          )}
          {mobileTab === 'overview' && (
            <ScrollArea className="h-full"><div className="p-3 space-y-3"><IndustryPanel /></div></ScrollArea>
          )}
          {mobileTab === 'activity' && (
            <ScrollArea className="h-full"><div className="p-3 space-y-3"><EventTimeline /><AuditLogPanel /></div></ScrollArea>
          )}
          {mobileTab === 'comms' && (
            <ScrollArea className="h-full"><div className="p-3 space-y-3"><CommunicationsPanel /></div></ScrollArea>
          )}
          {mobileTab === 'reports' && (
            <ScrollArea className="h-full"><div className="p-3 space-y-3"><ReportingDashboard /></div></ScrollArea>
          )}
          {mobileTab === 'docs' && (
            <ScrollArea className="h-full"><div className="p-3 space-y-3"><DocumentsPanel /><WorkflowsPanel /><IntegrationsPanel /></div></ScrollArea>
          )}
          {mobileTab === 'scheduler' && (
            <ScrollArea className="h-full"><div className="p-3 space-y-3"><AgentSchedulerPanel /></div></ScrollArea>
          )}
          {mobileTab === 'team' && (
            <ScrollArea className="h-full"><div className="p-3 space-y-3"><UserManagementPanel /></div></ScrollArea>
          )}
        </div>

        <MobileBottomNav activeTab={mobileTab} onTabChange={handleMobileTabChange} />
        <MobileAgentsDrawer open={agentsDrawerOpen} onOpenChange={setAgentsDrawerOpen} />
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
      <DashboardHeader />
      <OnboardingTour />

      <div className="flex md:grid md:grid-cols-[220px_1fr_minmax(320px,420px)] flex-1 overflow-hidden min-w-0 w-full">
        <LeftSidebar>
          <AgentsSidebar />
        </LeftSidebar>

        <MainCommandCenter>
          <CommandCenter className="flex-1 panel m-2" />
        </MainCommandCenter>

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
