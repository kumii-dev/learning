-- ============================================================
-- supabase/migrations/003_profiles_and_roles.sql
-- Add profiles table, user_roles table, and has_role() RPC.
-- Run via: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
-- Stores enriched user profile data synced from the Kumii platform.
create table if not exists public.profiles (
  id                      uuid primary key,
  email                   text not null,
  full_name               text,
  kumii_id                uuid,
  phone                   text,
  location                text,
  bio                     text,
  organization            text,
  persona_type            text,
  profile_picture_url     text,
  industry_sectors        text[],
  skills                  text[],
  interests               text[],
  profile_completion_pct  numeric(5,2),
  linkedin_url            text,
  twitter_url             text,
  startup_company_name    text,
  startup_industry        text,
  startup_stage           text,
  startup_description     text,
  startup_location        text,
  startup_website         text,
  startup_team_size       integer,
  startup_founded_year    integer,
  startup_key_products    text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ── user_roles ──────────────────────────────────────────────
-- Stores hub-side role assignments (admin, instructor, etc.)
create table if not exists public.user_roles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null,
  role       text not null check (role in ('admin', 'instructor', 'learner')),
  granted_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- ── has_role RPC ─────────────────────────────────────────────
-- Returns true if the given user has the given role.
create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role    = _role
  );
$$;
