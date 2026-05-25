-- Migration 018: add partner logo columns to certificate_templates
-- These store the URLs of custom logos uploaded per-course.
-- logo_left_url  → rendered top-left  on the certificate PDF
-- logo_right_url → rendered top-right on the certificate PDF
-- (Kumii logo moves to bottom-left)

alter table public.certificate_templates
  add column if not exists logo_left_url  text,
  add column if not exists logo_right_url text;
