-- =====================================================================
-- supabase/migrations/021_profiles_first_last_name.sql
--
-- Add first_name and last_name columns to public.profiles so that the
-- certificate PDF (and any other surface) can use the learner's proper
-- given name rather than relying on full_name only.
--
-- The auth sync route (POST /api/auth/sync) will begin populating these
-- from the Kumii postMessage profile payload after this migration runs.
-- Existing rows will have NULL until the learner next logs in.
--
-- Run in: Supabase Dashboard → SQL Editor
-- =====================================================================

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text;

-- Back-fill from full_name where it contains a space
-- e.g. "Khulekani Mncube" → first_name='Khulekani', last_name='Mncube'
-- Multi-word last names (e.g. "Van Der Berg") are left as-is in last_name.
update public.profiles
set
  first_name = split_part(trim(full_name), ' ', 1),
  last_name  = trim(substring(trim(full_name) from position(' ' in trim(full_name)) + 1))
where
  full_name is not null
  and full_name <> ''
  and position(' ' in trim(full_name)) > 0
  and first_name is null;
