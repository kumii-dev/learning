-- Migration 020: enforce one template per course and add updated_at
-- Without this unique constraint Supabase's upsert(onConflict:'course_id')
-- has nowhere to resolve the conflict and silently no-ops, meaning logo
-- URLs uploaded via the CMS were never persisted.

-- Add updated_at column if not already present (migration 018 assumed it existed)
alter table public.certificate_templates
  add column if not exists updated_at timestamptz not null default now();

-- Add the unique constraint that makes upsert(onConflict:'course_id') work
alter table public.certificate_templates
  drop constraint if exists certificate_templates_course_id_key;

alter table public.certificate_templates
  add constraint certificate_templates_course_id_key unique (course_id);
