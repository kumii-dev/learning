-- Migration 023: add timer_minutes to assessments
-- Allows each assessment to have a configurable countdown timer duration.
-- Defaults to 5 minutes to preserve existing behaviour.

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS timer_minutes integer NOT NULL DEFAULT 5;
