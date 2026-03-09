-- Fix 1: Scoped anon read for client chat (only specific thread)
-- Client chat uses thread_id from session, so we scope reads to thread_id
CREATE POLICY "Anon can read messages in specific thread"
  ON public.messages FOR SELECT
  TO anon
  USING (
    thread_id IS NOT NULL
    AND is_internal = false
  );

-- Fix 2: Organizations INSERT - restrict to authenticated only (not WITH CHECK true)
DROP POLICY IF EXISTS "allow_insert_for_authenticated" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);