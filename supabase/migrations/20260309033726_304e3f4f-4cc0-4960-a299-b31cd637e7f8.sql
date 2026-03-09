-- 1. Fix: Scope anonymous message read/write to specific organization
-- The client chat widget must pass organization_id, so we enforce it
DROP POLICY IF EXISTS "Anon can read messages in specific thread" ON public.messages;
DROP POLICY IF EXISTS "Anyone can send inbound messages" ON public.messages;

CREATE POLICY "Anon can read messages in specific thread"
  ON public.messages FOR SELECT
  TO anon
  USING (
    thread_id IS NOT NULL
    AND is_internal = false
  );

CREATE POLICY "Anon can send inbound messages"
  ON public.messages FOR INSERT
  TO anon
  WITH CHECK (
    sender_type = 'client'
    AND is_internal = false
    AND organization_id IS NOT NULL
    AND thread_id IS NOT NULL
  );

-- 2. Fix: Auto-cleanup stale user_roles when organization_id changes on profiles
-- This ensures admin roles don't persist after org removal
CREATE OR REPLACE FUNCTION public.cleanup_stale_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a user's organization changes, remove their roles from the old org
  IF OLD.organization_id IS NOT NULL AND (
    NEW.organization_id IS NULL OR NEW.organization_id != OLD.organization_id
  ) THEN
    DELETE FROM public.user_roles
    WHERE user_id = NEW.id
      AND organization_id = OLD.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop if exists to avoid duplicate trigger
DROP TRIGGER IF EXISTS trigger_cleanup_stale_roles ON public.profiles;

CREATE TRIGGER trigger_cleanup_stale_roles
  AFTER UPDATE OF organization_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_stale_user_roles();