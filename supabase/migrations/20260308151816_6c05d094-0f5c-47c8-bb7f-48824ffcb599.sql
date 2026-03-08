
-- Invitations table
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, email, status)
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- CEO/Admin can manage invitations
CREATE POLICY "CEO/Admin can manage invitations"
  ON public.invitations FOR ALL TO authenticated
  USING (is_org_ceo_or_admin(auth.uid(), organization_id));

-- Org members can view invitations
CREATE POLICY "Org members can view invitations"
  ON public.invitations FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), organization_id));

-- Anyone authenticated can read invitations by token (for accepting)
CREATE POLICY "Users can read own invitation by email"
  ON public.invitations FOR SELECT TO authenticated
  USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Update trigger
CREATE TRIGGER update_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.invitations;
