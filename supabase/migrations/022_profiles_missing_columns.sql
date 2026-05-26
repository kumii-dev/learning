-- =====================================================================
-- supabase/migrations/022_profiles_missing_columns.sql
--
-- Adds all columns that auth.js writes during POST /api/auth/sync
-- but are missing from the live profiles table.
-- All statements are idempotent (IF NOT EXISTS).
--
-- Root cause: migration 003 defined these columns but they were not
-- applied to the live Supabase project.
--
-- Run in: Supabase Dashboard → SQL Editor
-- =====================================================================

alter table public.profiles
  add column if not exists bio                     text,
  add column if not exists phone                   text,
  add column if not exists location                text,
  add column if not exists organization            text,
  add column if not exists persona_type            text,
  add column if not exists profile_picture_url     text,
  add column if not exists industry_sectors        text[],
  add column if not exists skills                  text[],
  add column if not exists interests               text[],
  add column if not exists profile_completion_pct  numeric(5,2),
  add column if not exists linkedin_url            text,
  add column if not exists twitter_url             text,
  add column if not exists kumii_id                uuid,
  add column if not exists role                    text,
  add column if not exists startup_company_name    text,
  add column if not exists startup_industry        text,
  add column if not exists startup_stage           text,
  add column if not exists startup_description     text,
  add column if not exists startup_location        text,
  add column if not exists startup_website         text,
  add column if not exists startup_team_size       integer,
  add column if not exists startup_founded_year    integer,
  add column if not exists startup_key_products    text,
  add column if not exists updated_at              timestamptz not null default now();
