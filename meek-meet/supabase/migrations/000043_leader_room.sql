-- The leader room, upgraded: the way in (meeting access details) and the
-- leader reminder ledger (60 / 30 / 15 minutes before the circle).

-- 1. Access details for online rooms. The join link stays join_url; these
--    carry the room's meeting ID and passcode so members can also dial in.
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS access_id TEXT,
  ADD COLUMN IF NOT EXISTS access_code TEXT;

-- 2. The reminder ledger: one row per (meeting, leader, step) the moment a
--    60/30/15-minute reminder fires, so a re-run of the cron never doubles a
--    reminder. Serviced by /api/leader-reminders (external scheduler, 15 min).
CREATE TABLE IF NOT EXISTS public.meeting_leader_reminders (
  meeting_id UUID NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step SMALLINT NOT NULL CHECK (step IN (60, 30, 15)),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, user_id, step)
);

ALTER TABLE public.meeting_leader_reminders ENABLE ROW LEVEL SECURITY;

-- The cron runs with the service role (bypasses RLS); leaders may read their
-- own ledger rows so the room can show what has already gone out.
CREATE POLICY "Leaders can view their own reminder ledger"
  ON public.meeting_leader_reminders FOR SELECT
  USING (user_id = auth.uid());
