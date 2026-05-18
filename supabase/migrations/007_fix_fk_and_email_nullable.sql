-- ============================================================
-- supabase/migrations/007_fix_fk_and_email_nullable.sql
--
-- COMBINED idempotent fix — run this in Supabase Dashboard → SQL Editor.
-- Safe to run even if 005 and/or 006 have already been applied.
--
-- What it does:
--   1. Re-points enrolments.user_id  FK → public.profiles(id)
--      (was public.users which is always empty for Kumii users)
--   2. Re-points submissions.user_id FK → public.profiles(id)
--   3. Re-points submissions.grader_id FK → public.profiles(id)
--   4. Drops NOT NULL from profiles.email
--      (email is a cached field — always present in JWT, but the
--       safety-net upsert may not have it on every code path)
-- ============================================================

-- ── 1. enrolments.user_id → profiles(id) ─────────────────────────────────
alter table public.enrolments
  drop constraint if exists enrolments_user_id_fkey;

alter table public.enrolments
  add constraint enrolments_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

-- ── 2. submissions.user_id → profiles(id) ────────────────────────────────
alter table public.submissions
  drop constraint if exists submissions_user_id_fkey;

alter table public.submissions
  add constraint submissions_user_id_fkey
  foreign key (user_id)
  references public.profiles(id)
  on delete cascade;

-- ── 3. submissions.grader_id → profiles(id) ──────────────────────────────
alter table public.submissions
  drop constraint if exists submissions_grader_id_fkey;

alter table public.submissions
  add constraint submissions_grader_id_fkey
  foreign key (grader_id)
  references public.profiles(id)
  on delete set null;

-- ── 4. profiles.email — drop NOT NULL ─────────────────────────────────────
alter table public.profiles
  alter column email drop not null;
