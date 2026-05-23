-- Migration 021: Add AI transcript + summary columns to live_sessions
-- All IF NOT EXISTS — safe to re-run.

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS transcript_text   text,
  ADD COLUMN IF NOT EXISTS transcript_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS summary_text      text,
  ADD COLUMN IF NOT EXISTS summary_status    text NOT NULL DEFAULT 'none';

-- transcript_status values: 'none' | 'processing' | 'done' | 'failed'
-- summary_status   values: 'none' | 'processing' | 'done' | 'failed'

COMMENT ON COLUMN public.live_sessions.transcript_text   IS 'Full plain-text transcript of the session (from Daily.co or OpenAI Whisper)';
COMMENT ON COLUMN public.live_sessions.transcript_status IS 'none | processing | done | failed';
COMMENT ON COLUMN public.live_sessions.summary_text      IS 'GPT-4o structured summary of the session transcript (Markdown)';
COMMENT ON COLUMN public.live_sessions.summary_status    IS 'none | processing | done | failed';
