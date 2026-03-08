
-- Messages table for client communications (chat, inbound email replies, etc.)
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  client_id UUID REFERENCES public.clients(id),
  agent_id UUID REFERENCES public.agents(id),
  sender_type TEXT NOT NULL DEFAULT 'client' CHECK (sender_type IN ('client', 'agent', 'system', 'human')),
  sender_name TEXT,
  sender_email TEXT,
  channel TEXT NOT NULL DEFAULT 'chat' CHECK (channel IN ('chat', 'email', 'phone', 'portal')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  ai_classification TEXT,
  ai_confidence NUMERIC,
  ai_auto_responded BOOLEAN DEFAULT false,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  action_pipeline_id UUID REFERENCES public.action_pipeline(id),
  thread_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies: org members can manage, public insert for inbound from clients
CREATE POLICY "Org members can view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can manage messages"
  ON public.messages FOR ALL
  TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Allow anonymous inserts for inbound client messages (chat widget)
CREATE POLICY "Anyone can send inbound messages"
  ON public.messages FOR INSERT
  TO anon
  WITH CHECK (sender_type = 'client' AND is_internal = false);

-- Allow anonymous to read their own thread
CREATE POLICY "Anon can read own thread"
  ON public.messages FOR SELECT
  TO anon
  USING (thread_id IS NOT NULL AND sender_type IN ('client', 'agent', 'system'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Updated_at trigger
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
