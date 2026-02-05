-- Force RLS refresh by disabling and re-enabling
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Drop all policies and recreate them correctly
DROP POLICY IF EXISTS "Authenticated users can create organization" ON public.organizations;
DROP POLICY IF EXISTS "CEO/Admin can update organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;

-- Simple INSERT policy: any authenticated user can create
CREATE POLICY "allow_insert_for_authenticated"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: users can see orgs they're a member of
CREATE POLICY "allow_select_for_members"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_org_member(auth.uid(), id));

-- UPDATE: CEO/Admin can update
CREATE POLICY "allow_update_for_ceo_admin"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.is_org_ceo_or_admin(auth.uid(), id));