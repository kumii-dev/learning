-- ============================================================
-- supabase/migrations/005_fix_enrolments_fk.sql
--
-- BUG FIX: enrolments (and submissions) user_id FK pointed at
-- public.users, which itself references auth.users.
-- Kumii platform users are never in auth.users — they are synced
-- only into public.profiles via POST /api/auth/sync.
-- This caused: "violates foreign key constraint enrolments_user_id_fkey"
-- whenever a platform user tried to enrol.
--
-- Fix: re-point user_id FKs to public.profiles(id) on both
-- enrolments and submissions.
--
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── enrolments ────────────────────────────────────────────────────────────
alter table public.enrolments
  drop constraint if exists enrolments_user_id_fkey;

alter table public.enrolments
  add constraint enrolments_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

-- ── submissions ───────────────────────────────────────────────────────────
-- submissions has the same pattern: user_id & grader_id both pointed at
-- public.users — fix both to use profiles.

alter table public.submissions
  drop constraint if exists submissions_user_id_fkey;

alter table public.submissions
  add constraint submissions_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

alter table public.submissions
  drop constraint if exists submissions_grader_id_fkey;

alter table public.submissions
  add constraint submissions_grader_id_fkey
  foreign key (grader_id)
  references public.profiles(id)
  on delete set null;
