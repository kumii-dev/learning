-- ============================================================
-- supabase/migrations/008_profiles_role_default.sql
--
-- profiles.role CHECK constraint (profiles_role_check) only allows:
--   'platform_admin' | 'tenant_admin' | 'staff' | 'user'
--
-- Previous code was inserting 'learner' → check violation.
-- Fix: set column default to 'user' (correct value for regular users).
--
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

alter table public.profiles
  alter column role set default 'user';
