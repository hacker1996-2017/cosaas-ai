-- Drop and recreate the organization INSERT policy as explicitly PERMISSIVE
DROP POLICY IF EXISTS "Users without org can create organization" ON public.organizations;

CREATE POLICY "Users without org can create organization"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (public.get_user_organization_id(auth.uid()) IS NULL);