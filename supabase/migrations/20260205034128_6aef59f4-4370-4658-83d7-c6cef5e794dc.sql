-- Drop the problematic policy
DROP POLICY IF EXISTS "Users without org can create organization" ON public.organizations;

-- Create a simpler INSERT policy using the security definer function
CREATE POLICY "Users without org can create organization"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Use security definer function to check if user already has an org
  public.get_user_organization_id(auth.uid()) IS NULL
);