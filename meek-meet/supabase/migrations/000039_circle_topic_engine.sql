-- ============================================
-- 000039 — Circle topic engine: random question draws, swaps, attendance
-- ============================================
-- The circle week has a theme per weekday (packages/core circle-topics).
-- Four days before a meeting each reserved member draws their own questions
-- at random from the day's theme, and may redraw any question that doesn't
-- fit — every redraw is logged (handbook_question_swaps) so the platform can
-- see, at scale, which questions people answer and which they skip.
-- Leaders mark attendance through a guarded RPC (same pattern as role
-- changes: user-JWT clients never write these columns directly).

-- ── 1. session_handbooks.topic_id ───────────────────────────────
-- The theme the member's questions were drawn from (analytics + redraws).
ALTER TABLE public.session_handbooks
  ADD COLUMN IF NOT EXISTS topic_id TEXT;

COMMENT ON COLUMN public.session_handbooks.topic_id IS
  'The day-of-week circle topic (packages/core circle-topics id) this handbook''s questions were drawn from.';

-- ── 2. meetings.leader_pack_sent_at ─────────────────────────────
-- Idempotency stamp for the leader run-sheet email (sent alongside the
-- member handbooks, four days out).
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS leader_pack_sent_at TIMESTAMPTZ;

-- ── 3. RSVP attendance ──────────────────────────────────────────
ALTER TABLE public.rsvps
  ADD COLUMN IF NOT EXISTS attendance TEXT
    CHECK (attendance IN ('attended', 'absent')),
  ADD COLUMN IF NOT EXISTS attendance_marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.rsvps.attendance IS
  'Marked by the circle leader in the room: attended / absent. NULL = not yet marked.';

-- ── 4. mark_attendance RPC ──────────────────────────────────────
-- Guarded write: only a leader of the meeting's circle (or an admin) may
-- mark attendance, and only these columns. Mirrors the role-change pattern.
CREATE OR REPLACE FUNCTION public.mark_attendance(p_rsvp_id UUID, p_attendance TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circle_id UUID;
BEGIN
  IF p_attendance IS NOT NULL AND p_attendance NOT IN ('attended', 'absent') THEN
    RAISE EXCEPTION 'Invalid attendance value: %', p_attendance;
  END IF;

  SELECT m.circle_id INTO v_circle_id
  FROM rsvps r
  JOIN meetings m ON m.id = r.meeting_id
  WHERE r.id = p_rsvp_id;

  IF v_circle_id IS NULL THEN
    RAISE EXCEPTION 'RSVP not found';
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM circle_shepherds cs
      WHERE cs.circle_id = v_circle_id AND cs.user_id = auth.uid()
    )
    OR public.is_app_admin()
  ) THEN
    RAISE EXCEPTION 'Only the circle leader can mark attendance';
  END IF;

  UPDATE rsvps
  SET
    attendance = p_attendance,
    attendance_marked_at = CASE WHEN p_attendance IS NULL THEN NULL ELSE NOW() END,
    attendance_marked_by = CASE WHEN p_attendance IS NULL THEN NULL ELSE auth.uid() END
  WHERE id = p_rsvp_id;
END;
$$;

COMMENT ON FUNCTION public.mark_attendance(UUID, TEXT) IS
  'Leader-only attendance marking (attended/absent/NULL to clear); the only write path for rsvps.attendance.';

GRANT EXECUTE ON FUNCTION public.mark_attendance(UUID, TEXT) TO authenticated;

-- ── 5. handbook_question_swaps ──────────────────────────────────
-- Every redraw of a handbook question. The self-assortment dataset: which
-- questions members keep, and which they send back.
CREATE TABLE IF NOT EXISTS public.handbook_question_swaps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  handbook_id UUID REFERENCES public.session_handbooks(id) ON DELETE CASCADE NOT NULL,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  topic_id TEXT NOT NULL,
  slot INTEGER NOT NULL,               -- position in the member's question list (0-based)
  old_question_id TEXT NOT NULL,
  old_question TEXT NOT NULL,
  new_question_id TEXT NOT NULL,
  new_question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.handbook_question_swaps IS
  'Audit + analytics of every question a member redraws within a circle topic: which questions get answered and which get skipped, at scale.';

CREATE INDEX IF NOT EXISTS idx_handbook_swaps_handbook ON public.handbook_question_swaps (handbook_id);
CREATE INDEX IF NOT EXISTS idx_handbook_swaps_topic ON public.handbook_question_swaps (topic_id);
CREATE INDEX IF NOT EXISTS idx_handbook_swaps_question ON public.handbook_question_swaps (old_question_id);

ALTER TABLE public.handbook_question_swaps ENABLE ROW LEVEL SECURITY;

-- Members log redraws of their own handbook only.
CREATE POLICY "Members can log swaps on their own handbook"
  ON public.handbook_question_swaps FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Members can view swaps on their own handbook"
  ON public.handbook_question_swaps FOR SELECT
  USING (profile_id = auth.uid());

-- Leaders and admins read the self-assortment data for their circles.
CREATE POLICY "Leaders can view swaps in their circles"
  ON public.handbook_question_swaps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM circle_shepherds cs
      WHERE cs.circle_id = handbook_question_swaps.circle_id
        AND cs.user_id = auth.uid()
    )
    OR public.is_app_admin()
  );
