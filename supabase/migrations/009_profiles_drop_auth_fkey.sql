-- ============================================================
-- supabase/migrations/009_profiles_drop_auth_fkey.sql
--
-- profiles.id has a FK → auth.users(id) ON DELETE CASCADE.
-- Kumii platform users are synced via POST /api/auth/sync and
-- are NEVER inserted into auth.users — they authenticate via
-- the Kumii platform, not Supabase Auth.
--
-- This FK causes every profile upsert to fail with:
--   "insert or update on table profiles violates foreign key
--    constraint profiles_id_fkey"
--
-- Fix: drop the constraint. profiles.id remains a UUID primary
-- key — it just no longer needs to exist in auth.users.
--
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

alter table public.profiles
  drop constraint if exists profiles_id_fkey;
