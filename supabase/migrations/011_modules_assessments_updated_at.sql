-- Add updated_at to modules and assessments tables.
-- cmsService.js upserts these columns but they were absent from the initial schema.

alter table public.modules
  add column if not exists updated_at timestamptz;
update public.modules set updated_at = created_at where updated_at is null;

alter table public.assessments
  add column if not exists updated_at timestamptz;
update public.assessments set updated_at = created_at where updated_at is null;
