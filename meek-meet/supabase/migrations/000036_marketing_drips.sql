-- ============================================
-- 000036 Marketing Drip Sequences + Events
-- ============================================
-- 1. marketing_sequences: per-recipient drip ladder. Step 1 (parchment) goes
--    out on day 0, step 2 (midnight) on day 7, step 3 (terracotta) on day 14.
--    A reply (Resend inbound webhook) or a tracked link click stops the ladder.
-- 2. marketing_events: tracked link clicks (and, once inbound MX is
--    configured, replies) with theme + template — the conversion instrumentation.
-- 3. marketing_sends gains sequence_id/step so every drip send is attributable.

CREATE TABLE IF NOT EXISTS public.marketing_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL CHECK (kind IN ('person', 'org')),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  org_name TEXT,
  contact_name TEXT,
  template_key TEXT NOT NULL,           -- the A/B opener (rotated by email hash)
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'stopped_replied', 'stopped_engaged', 'stopped_manual')),
  current_step INTEGER NOT NULL DEFAULT 0,
  next_run_at TIMESTAMPTZ NOT NULL,
  started_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  stopped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipient_email, kind)
);

COMMENT ON TABLE public.marketing_sequences IS 'Per-recipient drip ladders: theme-escalated follow-ups until reply/click/completion.';

ALTER TABLE public.marketing_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read sequences" ON public.marketing_sequences;
CREATE POLICY "Admins can read sequences"
  ON public.marketing_sequences FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can manage sequences" ON public.marketing_sequences;
CREATE POLICY "Admins can manage sequences"
  ON public.marketing_sequences FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE TABLE IF NOT EXISTS public.marketing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL CHECK (kind IN ('click', 'reply')),
  recipient_email TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'parchment',
  template_key TEXT,
  send_id UUID REFERENCES public.marketing_sends(id) ON DELETE SET NULL,
  sequence_id UUID REFERENCES public.marketing_sequences(id) ON DELETE SET NULL,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_events IS 'Conversion instrumentation: tracked clicks and replies per theme/template.';

CREATE INDEX IF NOT EXISTS idx_marketing_events_kind ON public.marketing_events (kind, created_at DESC);

ALTER TABLE public.marketing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read marketing events" ON public.marketing_events;
CREATE POLICY "Admins can read marketing events"
  ON public.marketing_events FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Anyone can log a click" ON public.marketing_events;
CREATE POLICY "Anyone can log a click"
  ON public.marketing_events FOR INSERT
  WITH CHECK (kind = 'click');

ALTER TABLE public.marketing_sends
  ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES public.marketing_sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS step INTEGER;
