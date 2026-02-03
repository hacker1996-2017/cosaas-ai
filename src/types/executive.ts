// Chief of Staff AI — Executive OS Type Definitions

export type AgentStatus = 'available' | 'busy' | 'error';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DecisionStatus = 'pending' | 'approved' | 'rejected' | 'modified';
export type AutonomyLevel = 'observe_only' | 'recommend' | 'draft_actions' | 'execute_with_approval' | 'execute_autonomous';
export type CommandStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'escalated';
export type EventType = 'ai_action' | 'human_decision' | 'kpi_milestone' | 'external_event' | 'escalation' | 'integration';

export interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  status: AgentStatus;
  activeClients: number;
  maxCapacity: number;
  quotaUsed: number;
  quotaMax: number;
  instructions: string;
  deliverables: string[];
  taskMemory: TaskMemory[];
  auditLog: AuditLogEntry[];
}

export interface TaskMemory {
  id: string;
  task: string;
  status: 'completed' | 'ongoing' | 'pending';
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  status: 'success' | 'warning' | 'error';
}

export interface Decision {
  id: string;
  title: string;
  status: DecisionStatus;
  confidenceScore: number;
  riskLevel: RiskLevel;
  agentProposing: string;
  reasoning: string;
  impactIfApproved: string;
  impactIfRejected: string;
  financialImpact?: string;
  deadline: Date;
}

export interface TimelineEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  title: string;
  description: string;
  agentInvolved?: string;
  icon: string;
  color: 'green' | 'blue' | 'orange' | 'red';
  confidenceScore?: number;
}

export interface Client {
  id: string;
  name: string;
  type: 'startup' | 'enterprise' | 'smb';
  industry: string;
  status: 'prospect' | 'onboarding' | 'active' | 'paused' | 'churned';
  mrr: number;
  riskOfChurn: 'low' | 'medium' | 'high';
  expansionOpportunity: 'low' | 'medium' | 'high';
  primaryContact: {
    name: string;
    email: string;
    phone?: string;
  };
  memorySummary: string;
  integrations: Integration[];
}

export interface Integration {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: Date;
  syncErrors: number;
}

export interface ChatMessage {
  id: string;
  role: 'ceo' | 'ai';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  confidenceScore?: number;
  riskLevel?: RiskLevel;
}

export interface BusinessContext {
  market: string;
  totalClients: number;
  industry: string;
  revenue?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  aiAssistAvailable: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt';
  uploadedAt: Date;
  summary: string;
  tags: string[];
}
