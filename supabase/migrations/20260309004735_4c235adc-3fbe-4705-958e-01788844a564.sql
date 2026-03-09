
-- Google Calendar tokens: per-user OAuth token storage
CREATE TABLE public.google_calendar_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  organization_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamp with time zone,
  scope text,
  email text,
  token_type text DEFAULT 'Bearer',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own calendar tokens"
  ON public.google_calendar_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar tokens"
  ON public.google_calendar_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar tokens"
  ON public.google_calendar_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar tokens"
  ON public.google_calendar_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
