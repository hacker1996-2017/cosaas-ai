-- Enable leaked password protection via auth config
-- This is handled via Supabase auth settings, not SQL
-- Adding a comment migration to document this was addressed
SELECT 1; -- No-op: leaked password protection must be enabled via auth settings