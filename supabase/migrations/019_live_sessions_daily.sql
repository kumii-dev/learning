-- Migration 019: swap video provider from Jitsi to Daily.co
-- Rename jitsi_room → room_name (provider-agnostic column name)
-- Update the platform default to 'daily'

alter table public.live_sessions
  rename column jitsi_room to room_name;

alter table public.live_sessions
  alter column platform set default 'daily';

-- Back-fill existing rows so nothing breaks
update public.live_sessions
  set platform = 'daily'
  where platform = 'jitsi' or platform is null;
