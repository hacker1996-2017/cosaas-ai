-- Fix: Profile INSERT must only allow organization_id = NULL at creation
-- This prevents privilege escalation via self-assigning to any org
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    AND organization_id IS NULL
  );