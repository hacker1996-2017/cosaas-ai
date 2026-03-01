
-- ============================================================
-- PHASE 1: ACTION PIPELINE + IMMUTABLE AUDIT LOG
-- ============================================================

-- Action status enum
CREATE TYPE public.action_status AS ENUM (
  'created', 'policy_evaluating', 'pending_approval', 
  'approved', 'rejected', 'dispatched', 'executing', 
  'completed', 'failed', 'cancelled'
);

-- Action category enum
CREATE TYPE public.action_category AS ENUM (
  'financial', 'communication', 'data_mutation', 
  'integration', 'scheduling', 'reporting', 'system'
);

-- Action Pipeline table — the sacred path
CREATE TABLE public.action_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  command_id UUID REFERENCES public.commands(id),
  agent_id UUID REFERENCES public.agents(id),
  created_by UUID NOT NULL,
  category action_category NOT NULL DEFAULT 'system',
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  action_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  status action_status NOT NULL DEFAULT 'created',
  -- Policy evaluation
  policy_result JSONB DEFAULT NULL,
  policy_evaluated_at TIMESTAMPTZ DEFAULT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  -- Approval
  approved_by UUID DEFAULT NULL,
  approved_at TIMESTAMPTZ DEFAULT NULL,
  approval_notes TEXT DEFAULT NULL,
  -- Execution
  dispatched_at TIMESTAMPTZ DEFAULT NULL,
  execution_started_at TIMESTAMPTZ DEFAULT NULL,
  execution_completed_at TIMESTAMPTZ DEFAULT NULL,
  execution_result JSONB DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  -- Evidence
  evidence JSONB DEFAULT NULL,
  -- Metadata
  risk_level public.risk_level NOT NULL DEFAULT 'low',
  idempotency_key TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_idempotency UNIQUE (organization_id, idempotency_key)
);

ALTER TABLE public.action_pipeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view actions"
  ON public.action_pipeline FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create actions"
  ON public.action_pipeline FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update actions"
  ON public.action_pipeline FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE INDEX idx_action_pipeline_org_status ON public.action_pipeline(organization_id, status);
CREATE INDEX idx_action_pipeline_command ON public.action_pipeline(command_id);

CREATE TRIGGER update_action_pipeline_updated_at
  BEFORE UPDATE ON public.action_pipeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Immutable Audit Log — append-only, hash-chained
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  sequence_number BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  actor_id UUID DEFAULT NULL,
  actor_type TEXT NOT NULL DEFAULT 'user', -- user, agent, system
  resource_type TEXT NOT NULL,
  resource_id UUID DEFAULT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash TEXT DEFAULT NULL,
  event_hash TEXT NOT NULL,
  ip_address INET DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_sequence UNIQUE (organization_id, sequence_number)
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view audit log"
  ON public.audit_log FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can insert audit entries"
  ON public.audit_log FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- No UPDATE or DELETE policies — audit log is immutable
CREATE INDEX idx_audit_log_org_sequence ON public.audit_log(organization_id, sequence_number DESC);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(organization_id, created_at DESC);

-- Enable realtime for action pipeline
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_pipeline;

-- ============================================================
-- PHASE 2: INSURANCE DATA MODEL
-- ============================================================

-- Insurance policy status
CREATE TYPE public.insurance_policy_status AS ENUM (
  'draft', 'quoted', 'bound', 'active', 'expired', 
  'cancelled', 'lapsed', 'renewed'
);

-- Premium status
CREATE TYPE public.premium_status AS ENUM (
  'due', 'paid', 'partial', 'overdue', 'waived', 'refunded'
);

-- Reconciliation status
CREATE TYPE public.reconciliation_status AS ENUM (
  'pending', 'matched', 'exception', 'resolved', 'escalated'
);

-- Insurers / Carriers
CREATE TABLE public.insurers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  code TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  commission_rate_default NUMERIC(5,4) DEFAULT 0.10,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view insurers" ON public.insurers FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage insurers" ON public.insurers FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER update_insurers_updated_at BEFORE UPDATE ON public.insurers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insurance Policies (not to be confused with policy_rules)
CREATE TABLE public.insurance_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  insurer_id UUID REFERENCES public.insurers(id),
  policy_number TEXT NOT NULL,
  policy_type TEXT NOT NULL, -- auto, home, commercial, life, health, etc.
  status insurance_policy_status NOT NULL DEFAULT 'draft',
  effective_date DATE,
  expiry_date DATE,
  premium_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,4) DEFAULT 0.10,
  commission_amount NUMERIC(12,2) DEFAULT 0,
  coverage_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view insurance policies" ON public.insurance_policies FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage insurance policies" ON public.insurance_policies FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_insurance_policies_client ON public.insurance_policies(client_id);
CREATE INDEX idx_insurance_policies_insurer ON public.insurance_policies(insurer_id);
CREATE INDEX idx_insurance_policies_status ON public.insurance_policies(organization_id, status);
CREATE TRIGGER update_insurance_policies_updated_at BEFORE UPDATE ON public.insurance_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Premiums
CREATE TABLE public.premiums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  insurance_policy_id UUID NOT NULL REFERENCES public.insurance_policies(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  status premium_status NOT NULL DEFAULT 'due',
  paid_amount NUMERIC(12,2) DEFAULT 0,
  paid_at TIMESTAMPTZ DEFAULT NULL,
  payment_method TEXT DEFAULT NULL,
  reference_number TEXT DEFAULT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.premiums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view premiums" ON public.premiums FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage premiums" ON public.premiums FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_premiums_policy ON public.premiums(insurance_policy_id);
CREATE INDEX idx_premiums_status ON public.premiums(organization_id, status);
CREATE TRIGGER update_premiums_updated_at BEFORE UPDATE ON public.premiums FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Commissions
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  insurance_policy_id UUID NOT NULL REFERENCES public.insurance_policies(id),
  insurer_id UUID NOT NULL REFERENCES public.insurers(id),
  expected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  received_amount NUMERIC(12,2) DEFAULT 0,
  rate NUMERIC(5,4) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, received, partial, disputed
  received_at TIMESTAMPTZ DEFAULT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view commissions" ON public.commissions FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage commissions" ON public.commissions FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reconciliation Batches
CREATE TABLE public.reconciliation_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  insurer_id UUID REFERENCES public.insurers(id),
  batch_type TEXT NOT NULL DEFAULT 'premium', -- premium, commission
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  total_records INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  exception_count INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) DEFAULT 0,
  matched_amount NUMERIC(14,2) DEFAULT 0,
  discrepancy_amount NUMERIC(14,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  initiated_by UUID DEFAULT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view reconciliation batches" ON public.reconciliation_batches FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage reconciliation batches" ON public.reconciliation_batches FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE TRIGGER update_reconciliation_batches_updated_at BEFORE UPDATE ON public.reconciliation_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reconciliation Exceptions
CREATE TABLE public.reconciliation_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  batch_id UUID NOT NULL REFERENCES public.reconciliation_batches(id),
  insurance_policy_id UUID REFERENCES public.insurance_policies(id),
  exception_type TEXT NOT NULL, -- amount_mismatch, missing_payment, duplicate, unmatched
  expected_amount NUMERIC(12,2) DEFAULT NULL,
  actual_amount NUMERIC(12,2) DEFAULT NULL,
  discrepancy NUMERIC(12,2) DEFAULT NULL,
  status reconciliation_status NOT NULL DEFAULT 'exception',
  resolution_notes TEXT DEFAULT NULL,
  resolved_by UUID DEFAULT NULL,
  resolved_at TIMESTAMPTZ DEFAULT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reconciliation_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view exceptions" ON public.reconciliation_exceptions FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org members can manage exceptions" ON public.reconciliation_exceptions FOR ALL USING (public.is_org_member(auth.uid(), organization_id));
CREATE INDEX idx_reconciliation_exceptions_batch ON public.reconciliation_exceptions(batch_id);
CREATE TRIGGER update_reconciliation_exceptions_updated_at BEFORE UPDATE ON public.reconciliation_exceptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PHASE 3: POLICY ENGINE + KILL SWITCH
-- ============================================================

-- Policy Rules — configurable governance rules
CREATE TABLE public.policy_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  scope TEXT NOT NULL DEFAULT 'global', -- global, industry, custom
  category action_category NOT NULL,
  condition JSONB NOT NULL, -- structured condition: {field, operator, value}
  action TEXT NOT NULL DEFAULT 'require_approval', -- require_approval, block, allow, escalate
  risk_level public.risk_level NOT NULL DEFAULT 'medium',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.policy_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view policy rules" ON public.policy_rules FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "CEO/Admin can manage policy rules" ON public.policy_rules FOR ALL USING (public.is_org_ceo_or_admin(auth.uid(), organization_id));
CREATE INDEX idx_policy_rules_org_active ON public.policy_rules(organization_id, is_active);
CREATE TRIGGER update_policy_rules_updated_at BEFORE UPDATE ON public.policy_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Industry Kits — versioned configuration packages
CREATE TABLE public.industry_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  industry_key TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'active', -- draft, active, deprecated
  kit_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  installed_by UUID DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_industry_per_org UNIQUE (organization_id, industry_key)
);

ALTER TABLE public.industry_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can view industry kits" ON public.industry_kits FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "CEO/Admin can manage industry kits" ON public.industry_kits FOR ALL USING (public.is_org_ceo_or_admin(auth.uid(), organization_id));
CREATE TRIGGER update_industry_kits_updated_at BEFORE UPDATE ON public.industry_kits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add kill switch and rate limiting to organizations
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS kill_switch_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_actions_per_hour INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS max_concurrent_actions INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS actions_this_hour INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hour_reset_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Audit log hash function (security definer to ensure integrity)
CREATE OR REPLACE FUNCTION public.generate_audit_hash(
  p_org_id UUID,
  p_event_type TEXT,
  p_action TEXT,
  p_details JSONB,
  p_previous_hash TEXT,
  p_timestamp TIMESTAMPTZ
) RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT encode(
    sha256(
      convert_to(
        COALESCE(p_org_id::text, '') || '|' ||
        COALESCE(p_event_type, '') || '|' ||
        COALESCE(p_action, '') || '|' ||
        COALESCE(p_details::text, '') || '|' ||
        COALESCE(p_previous_hash, 'GENESIS') || '|' ||
        COALESCE(p_timestamp::text, ''),
        'UTF8'
      )
    ),
    'hex'
  )
$$;

-- Function to get next audit sequence number
CREATE OR REPLACE FUNCTION public.next_audit_sequence(p_org_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(sequence_number), 0) + 1
  FROM public.audit_log
  WHERE organization_id = p_org_id
$$;

-- Function to get latest audit hash for chaining
CREATE OR REPLACE FUNCTION public.latest_audit_hash(p_org_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT event_hash FROM public.audit_log 
     WHERE organization_id = p_org_id 
     ORDER BY sequence_number DESC LIMIT 1),
    'GENESIS'
  )
$$;

-- Enable realtime for audit log
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
