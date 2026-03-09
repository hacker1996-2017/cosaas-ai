
-- Agent Execution Memory: stores outcomes + reasoning chains for continuous learning
CREATE TABLE public.agent_execution_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  action_pipeline_id UUID REFERENCES public.action_pipeline(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL DEFAULT 'system',
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
  success_score NUMERIC DEFAULT 0 CHECK (success_score >= 0 AND success_score <= 1),
  reasoning_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  lessons_learned TEXT[] DEFAULT '{}'::text[],
  duration_ms INTEGER DEFAULT 0,
  error_details TEXT,
  similar_past_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_execution_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view execution memory" ON public.agent_execution_memory
  FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage execution memory" ON public.agent_execution_memory
  FOR ALL TO authenticated USING (is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_agent_memory_agent ON public.agent_execution_memory(agent_id, action_type);
CREATE INDEX idx_agent_memory_org ON public.agent_execution_memory(organization_id, created_at DESC);
CREATE INDEX idx_agent_memory_outcome ON public.agent_execution_memory(agent_id, outcome);

-- Execution Evidence: post-execution verification proofs
CREATE TABLE public.execution_evidence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action_pipeline_id UUID NOT NULL REFERENCES public.action_pipeline(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  evidence_type TEXT NOT NULL,
  evidence_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'inconclusive')),
  verified_at TIMESTAMPTZ,
  verification_method TEXT,
  confidence_score NUMERIC DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  discrepancies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.execution_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view evidence" ON public.execution_evidence
  FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage evidence" ON public.execution_evidence
  FOR ALL TO authenticated USING (is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_evidence_action ON public.execution_evidence(action_pipeline_id);
CREATE INDEX idx_evidence_status ON public.execution_evidence(verification_status);

-- Agent Follow-ups: auto-scheduled follow-ups after execution
CREATE TABLE public.agent_follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  action_pipeline_id UUID REFERENCES public.action_pipeline(id) ON DELETE SET NULL,
  follow_up_type TEXT NOT NULL CHECK (follow_up_type IN ('verification', 'reminder', 'escalation', 'review', 'check_in')),
  description TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped', 'escalated', 'overdue')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  auto_created BOOLEAN NOT NULL DEFAULT true,
  parent_follow_up_id UUID REFERENCES public.agent_follow_ups(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view follow-ups" ON public.agent_follow_ups
  FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage follow-ups" ON public.agent_follow_ups
  FOR ALL TO authenticated USING (is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_follow_ups_due ON public.agent_follow_ups(due_at) WHERE status = 'pending';
CREATE INDEX idx_follow_ups_agent ON public.agent_follow_ups(agent_id, status);
CREATE INDEX idx_follow_ups_org ON public.agent_follow_ups(organization_id, status);

-- Agent Delegations: cross-agent task delegation and coordination
CREATE TABLE public.agent_delegations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  from_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  to_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  action_pipeline_id UUID REFERENCES public.action_pipeline(id) ON DELETE SET NULL,
  command_id UUID REFERENCES public.commands(id) ON DELETE SET NULL,
  delegation_type TEXT NOT NULL CHECK (delegation_type IN ('sub_task', 'handoff', 'collaboration', 'escalation')),
  task_description TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected', 'failed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  result JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view delegations" ON public.agent_delegations
  FOR SELECT TO authenticated USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage delegations" ON public.agent_delegations
  FOR ALL TO authenticated USING (is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_delegations_agents ON public.agent_delegations(from_agent_id, to_agent_id);
CREATE INDEX idx_delegations_status ON public.agent_delegations(status) WHERE status IN ('pending', 'in_progress');

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_follow_ups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_delegations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.execution_evidence;
