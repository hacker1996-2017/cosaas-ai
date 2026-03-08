
-- Enum for schedule frequency
CREATE TYPE public.schedule_frequency AS ENUM (
  'once', 'hourly', 'daily', 'weekly', 'monthly', 'cron'
);

-- Enum for scheduled task status
CREATE TYPE public.scheduled_task_status AS ENUM (
  'active', 'paused', 'completed', 'failed', 'expired'
);

-- Core scheduled_tasks table
CREATE TABLE public.scheduled_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  command_id UUID REFERENCES public.commands(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'command',
  task_config JSONB NOT NULL DEFAULT '{}'::jsonb,

  frequency schedule_frequency NOT NULL DEFAULT 'once',
  cron_expression TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',

  scheduled_at TIMESTAMPTZ NOT NULL,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  status scheduled_task_status NOT NULL DEFAULT 'active',
  priority INTEGER NOT NULL DEFAULT 5,
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_count INTEGER NOT NULL DEFAULT 0,

  execution_count INTEGER NOT NULL DEFAULT 0,
  last_execution_result JSONB,
  last_error TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}'::text[],

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Execution history
CREATE TABLE public.schedule_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_task_id UUID NOT NULL REFERENCES public.scheduled_tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  action_pipeline_id UUID REFERENCES public.action_pipeline(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_scheduled_tasks_org ON public.scheduled_tasks(organization_id);
CREATE INDEX idx_scheduled_tasks_next_run ON public.scheduled_tasks(next_run_at) WHERE status = 'active';
CREATE INDEX idx_scheduled_tasks_agent ON public.scheduled_tasks(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX idx_schedule_executions_task ON public.schedule_executions(scheduled_task_id);
CREATE INDEX idx_schedule_executions_org ON public.schedule_executions(organization_id);

-- RLS
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_executions ENABLE ROW LEVEL SECURITY;

-- Scheduled tasks policies
CREATE POLICY "Org members can view scheduled tasks"
  ON public.scheduled_tasks FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "CEO/Admin can manage scheduled tasks"
  ON public.scheduled_tasks FOR ALL
  TO authenticated
  USING (is_org_ceo_or_admin(auth.uid(), organization_id));

CREATE POLICY "Org members can create scheduled tasks"
  ON public.scheduled_tasks FOR INSERT
  TO authenticated
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Schedule executions policies
CREATE POLICY "Org members can view schedule executions"
  ON public.schedule_executions FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "System can manage schedule executions"
  ON public.schedule_executions FOR ALL
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedule_executions;

-- Updated_at trigger
CREATE TRIGGER update_scheduled_tasks_updated_at
  BEFORE UPDATE ON public.scheduled_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
