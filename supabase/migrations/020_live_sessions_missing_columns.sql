-- Migration 020: add any columns that migration 016 only put in the
-- CREATE TABLE block but never added via ALTER TABLE for pre-existing tables.
-- All statements are IF NOT EXISTS — safe to run multiple times.

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS join_url      text,
  ADD COLUMN IF NOT EXISTS meeting_url   text,
  ADD COLUMN IF NOT EXISTS max_attendees int,
  ADD COLUMN IF NOT EXISTS course_id     uuid,
  ADD COLUMN IF NOT EXISTS end_time      timestamptz,
  ADD COLUMN IF NOT EXISTS room_name     text,
  ADD COLUMN IF NOT EXISTS description   text,
  ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();
