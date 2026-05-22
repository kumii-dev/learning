-- =====================================================================
-- supabase/migrations/017_fix_certificates_fk.sql
--
-- BUG FIX: certificates.user_id FK pointed at public.users(id),
-- which itself references auth.users(id).
-- Kumii platform users are NEVER in auth.users — they are synced
-- only into public.profiles via POST /api/auth/sync.
-- This caused: "insert or update on table certificates violates
-- foreign key constraint certificates_user_id_fkey" whenever a
-- learner passed an assessment and the certificate was issued.
--
-- Fix: re-point certificates.user_id FK → public.profiles(id).
-- This is the same fix applied to enrolments + submissions in
-- migrations 005 and 007.
--
-- Run in: Supabase Dashboard → SQL Editor
-- =====================================================================

alter table public.certificates
  drop constraint if exists certificates_user_id_fkey;

alter table public.certificates
  add constraint certificates_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;
