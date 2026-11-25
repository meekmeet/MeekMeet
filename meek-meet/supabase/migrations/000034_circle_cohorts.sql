-- ============================================
-- 000034 Circle Cohorts + Standing Rooms
-- ============================================
-- Two pillars of the virtual-circle engine:
--
-- 1. Standing rooms: circles.zoom_room_url is the circle's persistent video
--    room (e.g. a Zoom PMI link). Digital meetings without an explicit join
--    URL fall back to it, so a circle always has "its room".
--
-- 2. Cohorts: members of the global (virtual-first) circle are grouped into
--    cohorts of at most COHORT_CAP (default 12) per meeting cycle. Areas with
--    enough members form their own cohorts; small/remote groups are ABSORBED
--    into the nearest cohort with spare capacity rather than left alone.
--    Cohorts are recomputed by the circle organizer; stability is preferred
--    so relationships compound across cycles.

-- ── 1. Standing room ────────────────────────────────────────────
ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS zoom_room_url TEXT;

COMMENT ON COLUMN public.circles.zoom_room_url IS 'Persistent video room for the circle (e.g. Zoom PMI). Used as the default join_url for digital meetings.';

-- ── 2. Geocoded member areas ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.member_areas (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  area_key TEXT NOT NULL,
  area_name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'profile_location',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.member_areas IS 'Normalized, optionally geocoded home area per member; drives cohort matching.';

ALTER TABLE public.member_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can upsert own area" ON public.member_areas;
CREATE POLICY "Members can upsert own area"
  ON public.member_areas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read member areas" ON public.member_areas;
CREATE POLICY "Admins can read member areas"
  ON public.member_areas FOR SELECT
  USING (public.is_app_admin());

-- ── 3. Cohorts and membership ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.circle_cohorts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  cohort_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  area_key TEXT,
  area_name TEXT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (circle_id, cohort_index)
);

COMMENT ON TABLE public.circle_cohorts IS 'Meeting cohorts within a circle (cap-bounded groups, recomputed per cycle).';

CREATE TABLE IF NOT EXISTS public.circle_cohort_members (
  cohort_id UUID NOT NULL REFERENCES public.circle_cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_satellite BOOLEAN NOT NULL DEFAULT false,  -- absorbed from a different area
  PRIMARY KEY (cohort_id, user_id)
);

COMMENT ON TABLE public.circle_cohort_members IS 'Membership of cohorts; satellite members joined from a neighbouring area.';

ALTER TABLE public.circle_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_cohort_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read own circle cohorts" ON public.circle_cohort_members;
CREATE POLICY "Members can read own circle cohorts"
  ON public.circle_cohort_members FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read cohorts" ON public.circle_cohorts;
CREATE POLICY "Admins can read cohorts"
  ON public.circle_cohorts FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can read cohort members" ON public.circle_cohort_members;
CREATE POLICY "Admins can read cohort members"
  ON public.circle_cohort_members FOR SELECT
  USING (public.is_app_admin());

-- Writes happen via the circle organizer (service role) or migrations; API
-- roles get read-only access governed by the policies above.
REVOKE INSERT, UPDATE, DELETE ON public.circle_cohorts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.circle_cohort_members FROM anon, authenticated;

-- ── 4. Cap config (non-secret) ──────────────────────────────────
INSERT INTO public.meek_meet_config (key, value)
VALUES ('cohort_cap', '12')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.meek_meet_config (key, value)
VALUES ('cohort_min_cluster', '3')
ON CONFLICT (key) DO NOTHING;
