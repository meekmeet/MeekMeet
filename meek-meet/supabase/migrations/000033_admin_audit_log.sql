-- ============================================
-- 000033 Admin Audit Log
-- ============================================
-- Append-only record of consequential admin actions: who did what, to what,
-- when, and with what parameters. Readable by admins; rows are inserted by
-- the admin-gated server actions themselves (actor = the signed-in admin),
-- so the log cannot be backfilled by non-admins through the API.

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,              -- dotted namespace, e.g. 'admin.invite', 'application.approve'
  target_type TEXT,                  -- e.g. 'profile', 'application', 'authority'
  target_id TEXT,                    -- uuid or free-form identifier
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_audit_log IS 'Append-only audit trail of admin actions.';

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_app_admin());

DROP POLICY IF EXISTS "Admins can write audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can write audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (public.is_app_admin() AND actor = auth.uid());
