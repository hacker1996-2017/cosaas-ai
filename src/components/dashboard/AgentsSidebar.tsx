import { useState } from 'react';
import { Agent, AutonomyLevel } from '@/types/executive';
import { AgentCard } from './AgentCard';
import { AutonomyControl } from './AutonomyControl';
import { ScrollArea } from '@/components/ui/scroll-area';

// Mock data for agents
const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Chief of Staff',
    emoji: '🧠',
    role: 'Orchestrator & Memory',
    status: 'available',
    activeClients: 3,
    maxCapacity: 5,
    quotaUsed: 450,
    quotaMax: 1500,
    instructions: 'Orchestrate all agents, maintain system memory, coordinate cross-departmental actions.',
    deliverables: ['Coordinated actions', 'Real-time audits', 'Memory management'],
    taskMemory: [
      { id: '1', task: 'Sync objectives', status: 'completed' },
      { id: '2', task: 'Audit decisions', status: 'ongoing' },
    ],
    auditLog: [
      { id: '1', timestamp: new Date(), action: 'System sync complete', status: 'success' },
      { id: '2', timestamp: new Date(Date.now() - 300000), action: 'Instructed Finance Agent', status: 'success' },
      { id: '3', timestamp: new Date(Date.now() - 420000), action: 'Monitored HR deliverable', status: 'success' },
    ],
  },
  {
    id: '2',
    name: 'HR Operations',
    emoji: '👥',
    role: 'Talent & People',
    status: 'busy',
    activeClients: 5,
    maxCapacity: 5,
    quotaUsed: 890,
    quotaMax: 1500,
    instructions: 'Handle hiring, performance reviews, employee satisfaction.',
    deliverables: ['Talent acquisition report', 'Employee satisfaction metrics'],
    taskMemory: [
      { id: '1', task: 'Review resumes', status: 'completed' },
      { id: '2', task: 'Schedule interviews', status: 'pending' },
    ],
    auditLog: [
      { id: '1', timestamp: new Date(), action: 'Received instruction from CoS', status: 'success' },
      { id: '2', timestamp: new Date(Date.now() - 120000), action: 'Processed resumes', status: 'success' },
    ],
  },
  {
    id: '3',
    name: 'Finance',
    emoji: '💰',
    role: 'Budget & Revenue',
    status: 'available',
    activeClients: 2,
    maxCapacity: 5,
    quotaUsed: 320,
    quotaMax: 1500,
    instructions: 'Manage budgets, forecast revenue, handle invoicing.',
    deliverables: ['Monthly financial report', 'Cost optimization plan'],
    taskMemory: [
      { id: '1', task: 'Reconcile accounts', status: 'completed' },
      { id: '2', task: 'Audit expenses', status: 'ongoing' },
    ],
    auditLog: [
      { id: '1', timestamp: new Date(), action: 'Budget reconciled', status: 'success' },
      { id: '2', timestamp: new Date(Date.now() - 120000), action: 'Expense audit started', status: 'success' },
    ],
  },
  {
    id: '4',
    name: 'Tech Ops',
    emoji: '⚙️',
    role: 'Infrastructure & Deploy',
    status: 'available',
    activeClients: 1,
    maxCapacity: 5,
    quotaUsed: 200,
    quotaMax: 1500,
    instructions: 'Maintain infrastructure, deploy updates, security audits.',
    deliverables: ['System uptime report', 'Security audit'],
    taskMemory: [
      { id: '1', task: 'Patch servers', status: 'completed' },
      { id: '2', task: 'Optimize database', status: 'pending' },
    ],
    auditLog: [
      { id: '1', timestamp: new Date(), action: 'Servers patched', status: 'success' },
      { id: '2', timestamp: new Date(Date.now() - 120000), action: 'Database optimization queued', status: 'warning' },
    ],
  },
  {
    id: '5',
    name: 'Sales & Marketing',
    emoji: '📈',
    role: 'Leads & Campaigns',
    status: 'busy',
    activeClients: 4,
    maxCapacity: 5,
    quotaUsed: 780,
    quotaMax: 1500,
    instructions: 'Generate leads, run campaigns, pipeline management.',
    deliverables: ['Sales pipeline update', 'Campaign ROI analysis'],
    taskMemory: [
      { id: '1', task: 'Email campaign', status: 'completed' },
      { id: '2', task: 'Lead qualification', status: 'ongoing' },
    ],
    auditLog: [
      { id: '1', timestamp: new Date(), action: 'Campaign launched', status: 'success' },
      { id: '2', timestamp: new Date(Date.now() - 120000), action: 'Leads qualified', status: 'success' },
    ],
  },
  {
    id: '6',
    name: 'Customer Support',
    emoji: '🎧',
    role: 'Tickets & Feedback',
    status: 'available',
    activeClients: 2,
    maxCapacity: 5,
    quotaUsed: 410,
    quotaMax: 1500,
    instructions: 'Resolve tickets, gather feedback, customer satisfaction.',
    deliverables: ['Support resolution report', 'Customer satisfaction score'],
    taskMemory: [
      { id: '1', task: 'Respond to queries', status: 'completed' },
      { id: '2', task: 'Follow-up surveys', status: 'pending' },
    ],
    auditLog: [
      { id: '1', timestamp: new Date(), action: 'Tickets resolved', status: 'success' },
      { id: '2', timestamp: new Date(Date.now() - 120000), action: 'Surveys sent', status: 'success' },
    ],
  },
];

interface AgentsSidebarProps {
  className?: string;
}

export function AgentsSidebar({ className }: AgentsSidebarProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [autonomyLevel, setAutonomyLevel] = useState<AutonomyLevel>('draft_actions');

  return (
    <div className={`gradient-sidebar flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-bold text-foreground">AI EXECUTIVE AGENTS</h2>
      </div>

      {/* Agent Cards */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {mockAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isSelected={selectedAgent === agent.id}
              onClick={() => setSelectedAgent(agent.id === selectedAgent ? null : agent.id)}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Autonomy Control */}
      <div className="p-4 border-t border-sidebar-border">
        <AutonomyControl 
          value={autonomyLevel} 
          onChange={setAutonomyLevel} 
        />
      </div>
    </div>
  );
}
