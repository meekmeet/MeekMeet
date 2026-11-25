-- ============================================
-- 000040 — Circle territory: suburb claims
-- ============================================
-- An approved leader claims their suburb: circles carry a normalized
-- area_key (same normalization as member_areas and the circle organizer).
-- The approval flow creates the suburb's circle only when the suburb is
-- open (unclaimed) or expandable (overflowed); a claimed suburb with room
-- is locked to its existing circle. No hard unique constraint — expansion
-- legitimately creates successor circles in the same suburb.

ALTER TABLE public.circles
  ADD COLUMN IF NOT EXISTS area_key TEXT;

COMMENT ON COLUMN public.circles.area_key IS
  'Normalized suburb/area claim key (lower, trimmed, whitespace-collapsed). One active local circle per area_key until it overflows, then successors.';

-- Backfill from the free-text location.
UPDATE public.circles
SET area_key = lower(regexp_replace(btrim(location), '\s+', ' ', 'g'))
WHERE kind = 'local'
  AND location IS NOT NULL
  AND btrim(location) <> ''
  AND area_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_circles_area_key
  ON public.circles(area_key)
  WHERE kind = 'local';
