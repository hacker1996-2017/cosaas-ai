
-- Notification priority enum
CREATE TYPE public.notification_priority AS ENUM ('low', 'normal', 'high', 'critical');

-- Notification category enum  
CREATE TYPE public.notification_category AS ENUM (
  'action_required', 'decision_pending', 'execution_complete', 'execution_failed',
  'agent_alert', 'system', 'workflow', 'communication', 'security', 'compliance'
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  category notification_category NOT NULL DEFAULT 'system',
  priority notification_priority NOT NULL DEFAULT 'normal',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  action_label TEXT,
  source_type TEXT NOT NULL DEFAULT 'system',
  source_id UUID,
  agent_id UUID REFERENCES public.agents(id),
  icon TEXT DEFAULT '🔔',
  metadata JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_org ON public.notifications(organization_id, created_at DESC);
CREATE INDEX idx_notifications_category ON public.notifications(user_id, category, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update (mark read/dismiss) own notifications  
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Org members can insert notifications for users in their org
CREATE POLICY "Org members can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (is_org_member(auth.uid(), organization_id));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Updated_at trigger
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
