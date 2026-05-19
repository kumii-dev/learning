-- Migration 014: add content_type and pdf_url to modules
-- content_type values: 'text' | 'video_url' | 'video_file' | 'pdf'

alter table public.modules
  add column if not exists content_type text not null default 'text',
  add column if not exists pdf_url      text;

-- Back-fill existing rows that already have a video_url
update public.modules
  set content_type = 'video_url'
  where video_url is not null and video_url <> '';
