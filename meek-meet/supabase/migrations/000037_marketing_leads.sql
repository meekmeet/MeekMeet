-- ============================================
-- 000037 Marketing Leads
-- ============================================
-- A lead is an outreach target: an organisation (church, community centre,
-- charity, ...) with a publicly-listed contact email, or an individual added
-- by referral. Leads are the unit of the mass campaign: admins pick leads and
-- start a drip ladder; status is synced from the sequence (and from the
-- Resend webhook on reply). Live sequence progress is derived by the app via
-- a join on recipient email — this table holds only the workflow state.

CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kind TEXT NOT NULL CHECK (kind IN ('org', 'individual')),
  name TEXT NOT NULL,                     -- org name or person's name
  email TEXT NOT NULL,
  contact_name TEXT,                      -- named contact for orgs
  lead_type TEXT,                         -- church-catholic, church-anglican, charity, community-centre, council, library, mens-shed, service-club, welfare, youth, other...
  region TEXT,                            -- Central Coast | Lake Macquarie | Sydney | Other
  suburb TEXT,
  source_url TEXT,                        -- where the email was publicly listed
  faith TEXT,                             -- christian | islamic | jewish | buddhist | hindu | sikh | interfaith | secular
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'drip', 'replied', 'engaged', 'completed', 'stopped', 'bounced')),
  notes TEXT,
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (email)
);

COMMENT ON TABLE public.marketing_leads IS 'Outreach targets for the marketing campaign; drip ladders are started per-lead and status is synced from sequences/webhooks.';

ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read leads" ON public.marketing_leads;
CREATE POLICY "Admins can read leads"
  ON public.marketing_leads FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can manage leads" ON public.marketing_leads;
CREATE POLICY "Admins can manage leads"
  ON public.marketing_leads FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

CREATE INDEX IF NOT EXISTS idx_marketing_leads_region ON public.marketing_leads (region, status);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON public.marketing_leads (status, created_at DESC);

-- Sequences (000036) gain the recipient's faith tradition so every drip step
-- sends the right letter — the ladder follows the lead, not just the email.
ALTER TABLE public.marketing_sequences
  ADD COLUMN IF NOT EXISTS faith TEXT;
