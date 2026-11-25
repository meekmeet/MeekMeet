-- ============================================
-- 000032 Admin Marketing + Members
-- ============================================
-- Marketing outreach log: every invite email and organisation flyer sent from
-- the admin area is recorded here so admins can see exactly what was sent,
-- to whom, when, and by whom. Admins read their own sends; inserts carry the
-- sender's id via the admin-gated server action (is_app_admin()).

CREATE TABLE IF NOT EXISTS public.marketing_sends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL CHECK (kind IN ('person_invite', 'org_flyer')),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  recipient_org TEXT,
  template_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error TEXT,
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketing_sends IS 'Log of marketing outreach emails/flyers sent by admins.';

ALTER TABLE public.marketing_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read marketing sends" ON public.marketing_sends;
CREATE POLICY "Admins can read marketing sends"
  ON public.marketing_sends FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can log marketing sends" ON public.marketing_sends;
CREATE POLICY "Admins can log marketing sends"
  ON public.marketing_sends FOR INSERT
  WITH CHECK (public.is_app_admin() AND sent_by = auth.uid());
