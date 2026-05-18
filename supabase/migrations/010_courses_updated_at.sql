-- supabase/migrations/010_courses_updated_at.sql
-- Add updated_at column to courses table so the CMS can track edits.

alter table public.courses
  add column if not exists updated_at timestamptz;

-- Back-fill existing rows so the column is never null after a real edit
update public.courses set updated_at = created_at where updated_at is null;
