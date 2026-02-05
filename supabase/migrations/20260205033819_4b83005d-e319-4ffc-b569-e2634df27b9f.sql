-- Allow authenticated users to insert organizations (for new user onboarding)
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to insert their own user_roles (for CEO assignment during onboarding)
CREATE POLICY "Users can insert own role during onboarding"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());