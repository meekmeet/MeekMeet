-- ============================================
-- 000029 Virtual-first, self-organizing circles
-- ============================================
-- 1. circles.kind: 'global' circles meet virtually and have no fixed
--    geography; 'local' circles are the default in-person circles.
-- 2. Seed the Global New Moon Circle (virtual-first entry point).
-- 3. circle_auto_groups: audit trail of areas that grew out of the global
--    circle into their own local circles via the circle organizer.
-- All statements are idempotent.

-- ── 1. circles.kind + index ─────────────────────────────────────
ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'local'
  CHECK (kind IN ('global', 'local'));

COMMENT ON COLUMN public.circles.kind IS 'global = virtual-first circle without fixed geography; local = geographic circle (default).';

CREATE INDEX IF NOT EXISTS idx_circles_kind ON public.circles(kind);

-- ── 2. Seed the global entry circle ─────────────────────────────
INSERT INTO public.circles
  (id, slug, name, description, location, meeting_place, kind, is_active, country_code)
VALUES
  ('00000000-0000-4000-8000-000000000029',
   'global-new-moon',
   'Global New Moon Circle',
   'A warm, welcoming circle for people of all faiths, cultures and backgrounds. We gather virtually each new moon to share, listen and grow together — whoever you are, wherever you are, you are welcome here.',
   'Online — Zoom',
   'Zoom',
   'global',
   TRUE,
   'WW')
ON CONFLICT (slug) DO NOTHING;

-- ── 3. circle_auto_groups ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.circle_auto_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  area_key TEXT NOT NULL,          -- normalized location string (lower, trimmed, single-spaced)
  area_name TEXT NOT NULL,         -- display form of the area
  member_count INTEGER NOT NULL,   -- 'going' RSVPs from the global circle at creation time
  circle_id UUID REFERENCES public.circles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (area_key)
);

COMMENT ON TABLE public.circle_auto_groups IS 'Areas provisioned into their own local circles by the circle organizer; one row per area (unique area_key).';
COMMENT ON COLUMN public.circle_auto_groups.area_key IS 'Normalized location string used for de-duplication (lower(trim(location)) with whitespace collapsed).';
COMMENT ON COLUMN public.circle_auto_groups.area_name IS 'Human-readable area name shown on the created circle.';

ALTER TABLE public.circle_auto_groups ENABLE ROW LEVEL SECURITY;

-- Anonymous/authenticated users get no access; admins may read.
CREATE POLICY "Admins can view circle auto groups"
  ON public.circle_auto_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
