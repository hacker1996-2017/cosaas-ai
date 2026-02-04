-- ============================================
-- CHIEF OF STAFF AI — EXECUTIVE OS DATABASE SCHEMA
-- Complete Enterprise-Grade Schema with RLS
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- User roles enum
CREATE TYPE public.app_role AS ENUM ('ceo', 'admin', 'user');

-- Agent status enum
CREATE TYPE public.agent_status AS ENUM ('available', 'busy', 'error', 'maintenance');

-- Risk level enum
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Decision status enum
CREATE TYPE public.decision_status AS ENUM ('pending', 'approved', 'rejected', 'modified', 'expired');

-- Command status enum
CREATE TYPE public.command_status AS ENUM ('queued', 'in_progress', 'completed', 'failed', 'escalated', 'cancelled');

-- Autonomy level enum
CREATE TYPE public.autonomy_level AS ENUM ('observe_only', 'recommend', 'draft_actions', 'execute_with_approval', 'execute_autonomous');

-- Event type enum
CREATE TYPE public.event_type AS ENUM ('ai_action', 'human_decision', 'kpi_milestone', 'external_event', 'escalation', 'integration', 'system');

-- Client status enum
CREATE TYPE public.client_status AS ENUM ('prospect', 'onboarding', 'active', 'paused', 'churned');

-- Client type enum
CREATE TYPE public.client_type AS ENUM ('startup', 'smb', 'enterprise');

-- Integration status enum
CREATE TYPE public.integration_status AS ENUM ('connected', 'disconnected', 'error', 'pending');

-- Email status enum
CREATE TYPE public.email_status AS ENUM ('draft', 'scheduled', 'sent', 'failed', 'bounced');

-- Call status enum
CREATE TYPE public.call_status AS ENUM ('scheduled', 'in_progress', 'completed', 'missed', 'cancelled');

-- Document type enum
CREATE TYPE public.document_type AS ENUM ('pdf', 'docx', 'txt', 'xlsx', 'pptx', 'image', 'other');

-- Workflow step status enum
CREATE TYPE public.workflow_step_status AS ENUM ('not_started', 'in_progress', 'completed', 'failed', 'skipped');

-- ============================================
-- BASE TABLES
-- ============================================

-- 1. Organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  industry TEXT,
  market TEXT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  autonomy_level public.autonomy_level DEFAULT 'draft_actions',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. User roles table (separate from profiles as per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- 3. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}'::jsonb,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Agents table (AI Executive Agents)
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🤖',
  role TEXT NOT NULL,
  description TEXT,
  status public.agent_status DEFAULT 'available',
  active_tasks INTEGER DEFAULT 0,
  max_capacity INTEGER DEFAULT 5,
  quota_used INTEGER DEFAULT 0,
  quota_max INTEGER DEFAULT 1500,
  is_system_agent BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Agent instructions table
CREATE TABLE public.agent_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  instructions TEXT NOT NULL,
  deliverables TEXT[] DEFAULT '{}',
  triggers JSONB DEFAULT '[]'::jsonb,
  constraints JSONB DEFAULT '[]'::jsonb,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Clients table (Internal CRM)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  client_type public.client_type DEFAULT 'smb',
  status public.client_status DEFAULT 'prospect',
  industry TEXT,
  mrr DECIMAL(12, 2) DEFAULT 0,
  lifetime_value DECIMAL(12, 2) DEFAULT 0,
  risk_of_churn public.risk_level DEFAULT 'low',
  expansion_opportunity public.risk_level DEFAULT 'medium',
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Client memory log (Immutable)
CREATE TABLE public.client_memory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL DEFAULT 'interaction',
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  sentiment_score DECIMAL(3, 2),
  importance_score INTEGER DEFAULT 5 CHECK (importance_score >= 1 AND importance_score <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at - this is immutable
);

-- 8. Commands table (CEO instructions)
CREATE TABLE public.commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  command_text TEXT NOT NULL,
  parsed_intent JSONB DEFAULT '{}'::jsonb,
  status public.command_status DEFAULT 'queued',
  priority INTEGER DEFAULT 5,
  confidence_score DECIMAL(3, 2),
  risk_level public.risk_level DEFAULT 'low',
  estimated_duration_ms INTEGER,
  actual_duration_ms INTEGER,
  error_message TEXT,
  result JSONB,
  parent_command_id UUID REFERENCES public.commands(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 9. Command executions table (Execution steps)
CREATE TABLE public.command_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID NOT NULL REFERENCES public.commands(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  step_number INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT,
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  status public.command_status DEFAULT 'queued',
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 10. Decisions table
CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  command_id UUID REFERENCES public.commands(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status public.decision_status DEFAULT 'pending',
  confidence_score DECIMAL(3, 2),
  risk_level public.risk_level DEFAULT 'medium',
  reasoning TEXT,
  impact_if_approved TEXT,
  impact_if_rejected TEXT,
  financial_impact TEXT,
  deadline TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision_notes TEXT,
  auto_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ
);

-- 11. Timeline events table (Audit trail)
CREATE TABLE public.timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  command_id UUID REFERENCES public.commands(id) ON DELETE SET NULL,
  decision_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL,
  event_type public.event_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📌',
  color TEXT DEFAULT 'blue',
  confidence_score DECIMAL(3, 2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at - immutable audit trail
);

-- 12. Integrations table
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  status public.integration_status DEFAULT 'disconnected',
  config JSONB DEFAULT '{}'::jsonb,
  credentials_encrypted TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_errors INTEGER DEFAULT 0,
  error_message TEXT,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, service_name)
);

-- 13. Emails table
CREATE TABLE public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  command_id UUID REFERENCES public.commands(id) ON DELETE SET NULL,
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[] DEFAULT '{}',
  bcc_addresses TEXT[] DEFAULT '{}',
  subject TEXT NOT NULL,
  body_text TEXT,
  body_html TEXT,
  status public.email_status DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  thread_id TEXT,
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Calls table
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  command_id UUID REFERENCES public.commands(id) ON DELETE SET NULL,
  caller_number TEXT,
  callee_number TEXT NOT NULL,
  status public.call_status DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  recording_url TEXT,
  transcript TEXT,
  summary TEXT,
  sentiment_score DECIMAL(3, 2),
  action_items JSONB DEFAULT '[]'::jsonb,
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_type public.document_type DEFAULT 'other',
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  summary TEXT,
  extracted_text TEXT,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Workflows table
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT DEFAULT 'manual',
  trigger_config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_template BOOLEAN DEFAULT false,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Workflow steps table
CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  step_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}'::jsonb,
  status public.workflow_step_status DEFAULT 'not_started',
  ai_assist_available BOOLEAN DEFAULT true,
  timeout_seconds INTEGER DEFAULT 300,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org_id ON public.user_roles(organization_id);
CREATE INDEX idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX idx_agents_org_id ON public.agents(organization_id);
CREATE INDEX idx_agents_status ON public.agents(status);
CREATE INDEX idx_agent_instructions_agent_id ON public.agent_instructions(agent_id);
CREATE INDEX idx_clients_org_id ON public.clients(organization_id);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_client_memory_log_client_id ON public.client_memory_log(client_id);
CREATE INDEX idx_client_memory_log_created_at ON public.client_memory_log(created_at DESC);
CREATE INDEX idx_commands_org_id ON public.commands(organization_id);
CREATE INDEX idx_commands_status ON public.commands(status);
CREATE INDEX idx_commands_user_id ON public.commands(user_id);
CREATE INDEX idx_commands_created_at ON public.commands(created_at DESC);
CREATE INDEX idx_command_executions_command_id ON public.command_executions(command_id);
CREATE INDEX idx_decisions_org_id ON public.decisions(organization_id);
CREATE INDEX idx_decisions_status ON public.decisions(status);
CREATE INDEX idx_timeline_events_org_id ON public.timeline_events(organization_id);
CREATE INDEX idx_timeline_events_created_at ON public.timeline_events(created_at DESC);
CREATE INDEX idx_timeline_events_type ON public.timeline_events(event_type);
CREATE INDEX idx_integrations_org_id ON public.integrations(organization_id);
CREATE INDEX idx_emails_org_id ON public.emails(organization_id);
CREATE INDEX idx_emails_client_id ON public.emails(client_id);
CREATE INDEX idx_calls_org_id ON public.calls(organization_id);
CREATE INDEX idx_calls_client_id ON public.calls(client_id);
CREATE INDEX idx_documents_org_id ON public.documents(organization_id);
CREATE INDEX idx_workflows_org_id ON public.workflows(organization_id);
CREATE INDEX idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);

-- ============================================
-- HELPER FUNCTIONS (Security Definer)
-- ============================================

-- Get user's organization ID
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = user_uuid LIMIT 1
$$;

-- Check if user is member of organization
CREATE OR REPLACE FUNCTION public.is_org_member(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_uuid AND organization_id = org_uuid
  )
$$;

-- Check if user has specific role in organization
CREATE OR REPLACE FUNCTION public.has_org_role(user_uuid UUID, org_uuid UUID, check_role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid
      AND organization_id = org_uuid
      AND role = check_role
  )
$$;

-- Check if user is CEO of organization
CREATE OR REPLACE FUNCTION public.is_org_ceo(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_org_role(user_uuid, org_uuid, 'ceo')
$$;

-- Check if user is admin of organization
CREATE OR REPLACE FUNCTION public.is_org_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_org_role(user_uuid, org_uuid, 'admin')
$$;

-- Check if user is CEO or admin
CREATE OR REPLACE FUNCTION public.is_org_ceo_or_admin(user_uuid UUID, org_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = user_uuid
      AND organization_id = org_uuid
      AND role IN ('ceo', 'admin')
  )
$$;

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_memory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.command_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Organizations policies
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  USING (public.is_org_member(auth.uid(), id));

CREATE POLICY "CEO/Admin can update organization"
  ON public.organizations FOR UPDATE
  USING (public.is_org_ceo_or_admin(auth.uid(), id));

-- User roles policies
CREATE POLICY "Users can view roles in their org"
  ON public.user_roles FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "CEO/Admin can manage roles"
  ON public.user_roles FOR ALL
  USING (public.is_org_ceo_or_admin(auth.uid(), organization_id));

-- Profiles policies
CREATE POLICY "Users can view profiles in their org"
  ON public.profiles FOR SELECT
  USING (
    organization_id IS NULL 
    OR public.is_org_member(auth.uid(), organization_id)
    OR id = auth.uid()
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Agents policies
CREATE POLICY "Org members can view agents"
  ON public.agents FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "CEO/Admin can manage agents"
  ON public.agents FOR ALL
  USING (public.is_org_ceo_or_admin(auth.uid(), organization_id));

-- Agent instructions policies
CREATE POLICY "Org members can view instructions"
  ON public.agent_instructions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "CEO/Admin can manage instructions"
  ON public.agent_instructions FOR ALL
  USING (public.is_org_ceo_or_admin(auth.uid(), organization_id));

-- Clients policies
CREATE POLICY "Org members can view clients"
  ON public.clients FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage clients"
  ON public.clients FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Client memory log policies (immutable - no update/delete)
CREATE POLICY "Org members can view memory"
  ON public.client_memory_log FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert memory"
  ON public.client_memory_log FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Commands policies
CREATE POLICY "Org members can view commands"
  ON public.commands FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can create commands"
  ON public.commands FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) AND user_id = auth.uid());

CREATE POLICY "Org members can update commands"
  ON public.commands FOR UPDATE
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "CEO/Admin can delete commands"
  ON public.commands FOR DELETE
  USING (public.is_org_ceo_or_admin(auth.uid(), organization_id));

-- Command executions policies
CREATE POLICY "Org members can view executions"
  ON public.command_executions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.commands c
      WHERE c.id = command_id
      AND public.is_org_member(auth.uid(), c.organization_id)
    )
  );

CREATE POLICY "System can manage executions"
  ON public.command_executions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.commands c
      WHERE c.id = command_id
      AND public.is_org_member(auth.uid(), c.organization_id)
    )
  );

-- Decisions policies
CREATE POLICY "Org members can view decisions"
  ON public.decisions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage decisions"
  ON public.decisions FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Timeline events policies (immutable)
CREATE POLICY "Org members can view events"
  ON public.timeline_events FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert events"
  ON public.timeline_events FOR INSERT
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Integrations policies
CREATE POLICY "Org members can view integrations"
  ON public.integrations FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "CEO/Admin can manage integrations"
  ON public.integrations FOR ALL
  USING (public.is_org_ceo_or_admin(auth.uid(), organization_id));

-- Emails policies
CREATE POLICY "Org members can view emails"
  ON public.emails FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage emails"
  ON public.emails FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Calls policies
CREATE POLICY "Org members can view calls"
  ON public.calls FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage calls"
  ON public.calls FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Documents policies
CREATE POLICY "Org members can view documents"
  ON public.documents FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage documents"
  ON public.documents FOR ALL
  USING (public.is_org_member(auth.uid(), organization_id));

-- Workflows policies
CREATE POLICY "Org members can view workflows"
  ON public.workflows FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "CEO/Admin can manage workflows"
  ON public.workflows FOR ALL
  USING (public.is_org_ceo_or_admin(auth.uid(), organization_id));

-- Workflow steps policies
CREATE POLICY "Org members can view steps"
  ON public.workflow_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = workflow_id
      AND public.is_org_member(auth.uid(), w.organization_id)
    )
  );

CREATE POLICY "CEO/Admin can manage steps"
  ON public.workflow_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = workflow_id
      AND public.is_org_ceo_or_admin(auth.uid(), w.organization_id)
    )
  );

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_instructions_updated_at BEFORE UPDATE ON public.agent_instructions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON public.emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON public.workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ENABLE REALTIME FOR KEY TABLES
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.commands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.command_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.timeline_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;