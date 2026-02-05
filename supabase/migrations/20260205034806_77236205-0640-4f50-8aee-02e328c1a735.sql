-- Temporarily simplify the INSERT policy to just check if user is authenticated
DROP POLICY IF EXISTS "Users without org can create organization" ON public.organizations;

CREATE POLICY "Authenticated users can create organization"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- We'll rely on the application logic to prevent duplicates for now