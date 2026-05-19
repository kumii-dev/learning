-- Add progress tracking columns to enrolments.
-- progress_pct  : 0-100, updated as learner completes modules
-- updated_at    : timestamp of last progress write

alter table public.enrolments
  add column if not exists progress_pct numeric(5,2) not null default 0,
  add column if not exists updated_at   timestamptz  not null default now();
