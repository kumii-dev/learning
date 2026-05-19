-- Migration 015: add pdf_url to certificates for generated PDF storage
alter table public.certificates
  add column if not exists pdf_url text;
