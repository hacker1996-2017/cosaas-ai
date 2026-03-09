-- ============================================================
-- SECURITY HARDENING: Fix 5 critical vulnerabilities
-- ============================================================

-- 1. FIX: Anonymous users can read all organization messages
DROP POLICY IF EXISTS "Anon can read own thread" ON public.messages;

-- 2. FIX: User email addresses publicly readable without authentication
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;

CREATE POLICY "Users can view profiles in their org"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR is_org_member(auth.uid(), organization_id)
  );

-- 3. FIX: Authenticated users can assign themselves to any organization
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND (
      organization_id IS NULL
      OR organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- 4. FIX: Users can self-assign privileged roles (CEO/admin)
DROP POLICY IF EXISTS "Users can insert own role during onboarding" ON public.user_roles;

CREATE POLICY "Users can insert own role during onboarding"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'user'
  );

-- 5. FIX: Restrict invitation visibility to admins only (hides tokens)
DROP POLICY IF EXISTS "Org members can view invitations" ON public.invitations;

CREATE POLICY "Org members can view invitations"
  ON public.invitations FOR SELECT
  TO authenticated
  USING (
    is_org_ceo_or_admin(auth.uid(), organization_id)
    OR email = (SELECT profiles.email FROM profiles WHERE profiles.id = auth.uid())
  );

-- 6. FIX: Profiles INSERT policy was on 'public' role, restrict to authenticated
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());