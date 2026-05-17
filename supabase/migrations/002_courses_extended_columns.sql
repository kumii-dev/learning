-- ============================================================
-- supabase/migrations/002_courses_extended_columns.sql
-- Add extended metadata columns to the courses table.
-- Run via: Supabase Dashboard → SQL Editor
-- ============================================================

alter table public.courses
  add column if not exists level              text,
  add column if not exists category           text,
  add column if not exists estimated_hours    numeric(6,2),
  add column if not exists duration_min       integer,
  add column if not exists instructor         text,
  add column if not exists instructor_rating  numeric(3,2),
  add column if not exists enrolled_count     integer not null default 0,
  add column if not exists module_count       integer not null default 0,
  add column if not exists rating_count       integer not null default 0,
  add column if not exists provider           text,
  add column if not exists skills             text[] default '{}',
  add column if not exists topics             text[] default '{}',
  add column if not exists learning_outcomes  text[] default '{}',
  add column if not exists video_url          text;
