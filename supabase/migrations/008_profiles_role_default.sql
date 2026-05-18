-- ============================================================
-- supabase/migrations/008_profiles_role_default.sql
--
-- The profiles.role column exists as NOT NULL with no default.
-- Any upsert that omits the column fails with:
--   "null value in column role violates not-null constraint"
--
-- Fix: add a column-level default of 'learner' so partial upserts
-- (e.g. safety-net inserts) can never be blocked by a missing role.
--
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

alter table public.profiles
  alter column role set default 'learner';
