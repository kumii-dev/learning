-- ============================================================
-- Migration 016 — live_sessions table + Jitsi support + RSVPs
-- ============================================================

-- Create live_sessions if it doesn't exist, then add Jitsi columns
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  topic         text,
  description   text,
  instructor    text,
  scheduled_at  timestamptz NOT NULL,
  end_time      timestamptz,
  duration_min  int  DEFAULT 60,
  course_id     uuid,
  max_attendees int,
  status        text DEFAULT 'scheduled',
  platform      text DEFAULT 'jitsi',
  jitsi_room    text,
  room_password text,
  join_url      text,
  meeting_url   text,
  host_id       uuid,
  is_public     boolean DEFAULT true,
  recording_url text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Add Jitsi columns to existing tables (safe: IF NOT EXISTS)
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS jitsi_room    text,
  ADD COLUMN IF NOT EXISTS room_password text,
  ADD COLUMN IF NOT EXISTS platform      text DEFAULT 'jitsi',
  ADD COLUMN IF NOT EXISTS duration_min  int  DEFAULT 60,
  ADD COLUMN IF NOT EXISTS host_id       uuid,
  ADD COLUMN IF NOT EXISTS is_public     boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS recording_url text;

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'scheduled';

-- RSVPs table
CREATE TABLE IF NOT EXISTS public.session_rsvps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  rsvped_at   timestamptz DEFAULT now(),
  UNIQUE (session_id, user_id)
);

-- RLS
ALTER TABLE public.session_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own RSVPs" ON public.session_rsvps;
CREATE POLICY "Users can manage their own RSVPs"
  ON public.session_rsvps
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all RSVPs" ON public.session_rsvps;
CREATE POLICY "Admins can read all RSVPs"
  ON public.session_rsvps
  FOR SELECT
  USING (true);
