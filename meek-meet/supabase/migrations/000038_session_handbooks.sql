-- ============================================
-- Session Handbooks (the four-days-before form)
-- ============================================
-- Every member with a 'going' RSVP receives a handbook four days before a
-- meeting: the whole session in a form. They pre-answer the meeting's
-- questions in writing; in the room they read what they have already
-- thought through. The completed handbooks are the primary data source for
-- pattern analysis and the anonymised reports carried to decision-makers.
--
-- variant:
--   'first_circle' — a member's first handbook in this circle (a warmer,
--                    slower introduction; their introduction is read aloud)
--   'returning'    — a long-standing member (shorter intro, deeper questions)

CREATE TABLE IF NOT EXISTS public.session_handbooks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE NOT NULL,
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  variant TEXT NOT NULL DEFAULT 'returning'
    CHECK (variant IN ('first_circle', 'returning')),
  -- [{ "question_id": text, "question": text, "answer": text }]
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Free-form intentions / notes the member wants the leader to carry.
  intentions TEXT,
  emailed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (meeting_id, profile_id)
);

COMMENT ON TABLE public.session_handbooks IS
  'Pre-meeting forms: the whole session, pre-answered by each reserved member four days before the gathering.';

CREATE INDEX IF NOT EXISTS idx_session_handbooks_meeting ON public.session_handbooks (meeting_id);
CREATE INDEX IF NOT EXISTS idx_session_handbooks_profile ON public.session_handbooks (profile_id);
CREATE INDEX IF NOT EXISTS idx_session_handbooks_circle ON public.session_handbooks (circle_id);

ALTER TABLE public.session_handbooks ENABLE ROW LEVEL SECURITY;

-- A member sees and edits only their own handbook. Writing happens through
-- the member's own session (the dashboard handbook page) or the service role
-- (the dispatch cron creates rows and stamps emailed_at).
CREATE POLICY "Members can view their own handbook"
  ON public.session_handbooks FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Members can update their own handbook"
  ON public.session_handbooks FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- Circle leaders read every handbook in their circles — that is how the
-- session is led: each member reads their own answers, the leader holds the
-- room and carries the notes forward.
CREATE POLICY "Leaders can view handbooks in their circles"
  ON public.session_handbooks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM circle_shepherds cs
      WHERE cs.circle_id = session_handbooks.circle_id
        AND cs.user_id = auth.uid()
    )
    OR public.is_app_admin()
  );

-- Keep updated_at honest.
CREATE OR REPLACE FUNCTION public.touch_session_handbooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_session_handbooks_updated ON public.session_handbooks;
CREATE TRIGGER trg_session_handbooks_updated
  BEFORE UPDATE ON public.session_handbooks
  FOR EACH ROW EXECUTE FUNCTION public.touch_session_handbooks_updated_at();
