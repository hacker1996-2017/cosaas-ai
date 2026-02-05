-- Drop the overly permissive policy and replace with a more secure one
-- Users can only create one organization (check they don't already have one)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Users without org can create organization"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND organization_id IS NOT NULL
  )
);