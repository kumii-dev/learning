-- ============================================================
-- supabase/migrations/006_profiles_email_nullable.sql
--
-- BUG FIX: profiles.email was NOT NULL, causing the safety-net
-- upsert in enrolmentsService (minimal row: id + updated_at only)
-- to fail silently. No profile row was created → enrolments FK
-- violation persisted even after migration 005.
--
-- Fix: make profiles.email nullable.
-- Email is always available in the hub JWT and in the full sync
-- payload — this column is a cache, not a primary identifier.
--
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

alter table public.profiles
  alter column email drop not null;
