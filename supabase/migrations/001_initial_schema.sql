-- ============================================================
-- supabase/migrations/001_initial_schema.sql
-- Kumii Learning Hub — initial database schema
-- Run via: Supabase Dashboard → SQL Editor, or supabase db push
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── users ────────────────────────────────────────────────────
-- Mirrors Supabase auth.users; stores LMS-specific metadata.
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  persona     text not null default 'learner'
                  check (persona in ('learner', 'instructor', 'admin')),
  created_at  timestamptz not null default now()
);

-- ── courses ──────────────────────────────────────────────────
create table if not exists public.courses (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  description   text not null,
  tags          text[] default '{}',
  pass_mark     numeric(5,2) not null default 70,
  thumbnail_url text,
  published     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ── modules ──────────────────────────────────────────────────
create table if not exists public.modules (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  content     text not null,
  "order"     integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── assessments ──────────────────────────────────────────────
create table if not exists public.assessments (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  type        text not null check (type in ('quiz', 'assignment', 'project')),
  title       text not null,
  pass_mark   numeric(5,2) not null default 70,
  questions   jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

-- ── enrolments ───────────────────────────────────────────────
create table if not exists public.enrolments (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  course_id    uuid not null references public.courses(id) on delete cascade,
  status       text not null default 'enrolled'
                   check (status in ('enrolled', 'in_progress', 'completed')),
  enrolled_at  timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, course_id)
);

-- ── submissions ──────────────────────────────────────────────
create table if not exists public.submissions (
  id             uuid primary key default uuid_generate_v4(),
  assessment_id  uuid not null references public.assessments(id) on delete cascade,
  user_id        uuid not null references public.users(id) on delete cascade,
  answers        jsonb not null default '[]',
  score          numeric(5,2),
  status         text not null default 'pending'
                     check (status in ('pending', 'graded')),
  feedback       text,
  ai_feedback    text,
  grader_id      uuid references public.users(id),
  graded_at      timestamptz,
  submitted_at   timestamptz not null default now()
);

-- ── certificates ─────────────────────────────────────────────
create table if not exists public.certificates (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  template_id uuid,
  metadata    jsonb not null default '{}',
  issued_at   timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ── certificate_templates ────────────────────────────────────
-- CMS-managed; referenced by certificatesService
create table if not exists public.certificate_templates (
  id          uuid primary key default uuid_generate_v4(),
  course_id   uuid references public.courses(id) on delete set null,
  name        text not null,
  html        text,  -- template HTML with {{learner_name}}, {{course_title}}, etc.
  created_at  timestamptz not null default now()
);

-- ── Row Level Security ───────────────────────────────────────
-- Enable RLS on all tables (service_role bypasses RLS)
alter table public.users               enable row level security;
alter table public.courses             enable row level security;
alter table public.modules             enable row level security;
alter table public.assessments         enable row level security;
alter table public.enrolments          enable row level security;
alter table public.submissions         enable row level security;
alter table public.certificates        enable row level security;
alter table public.certificate_templates enable row level security;

-- Learners can read published courses
create policy "Learners read published courses"
  on public.courses for select
  using (published = true);

-- Learners can read their own enrolments
create policy "Learners read own enrolments"
  on public.enrolments for select
  using (user_id = auth.uid());

-- Learners can insert their own enrolments
create policy "Learners enrol"
  on public.enrolments for insert
  with check (user_id = auth.uid());

-- Learners read own submissions
create policy "Learners read own submissions"
  on public.submissions for select
  using (user_id = auth.uid());

-- Learners insert own submissions
create policy "Learners submit"
  on public.submissions for insert
  with check (user_id = auth.uid());

-- Learners read own certificates
create policy "Learners read own certificates"
  on public.certificates for select
  using (user_id = auth.uid());
