
-- HubSpot config: org-scoped Private App token storage
CREATE TABLE public.hubspot_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL UNIQUE,
  access_token text NOT NULL,
  portal_id text,
  hub_domain text,
  hub_name text,
  connected_by uuid,
  last_sync_at timestamp with time zone,
  contacts_synced integer DEFAULT 0,
  sync_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hubspot_config ENABLE ROW LEVEL SECURITY;

-- Only CEO/Admin can manage HubSpot config (contains sensitive token)
CREATE POLICY "CEO/Admin can manage HubSpot config"
  ON public.hubspot_config FOR ALL
  USING (is_org_ceo_or_admin(auth.uid(), organization_id))
  WITH CHECK (is_org_ceo_or_admin(auth.uid(), organization_id));

-- All org members can check if HubSpot is connected (status only, no token exposure via edge fn)
CREATE POLICY "Org members can view HubSpot status"
  ON public.hubspot_config FOR SELECT
  USING (is_org_member(auth.uid(), organization_id));

CREATE TRIGGER update_hubspot_config_updated_at
  BEFORE UPDATE ON public.hubspot_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
