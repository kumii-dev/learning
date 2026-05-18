-- Add columns that cmsService.js writes but were absent from the initial schema.

-- courses: level, category, estimated_hours
alter table public.courses
  add column if not exists level           text,
  add column if not exists category        text,
  add column if not exists estimated_hours numeric(6,2);

-- modules: video_url
alter table public.modules
  add column if not exists video_url text;
