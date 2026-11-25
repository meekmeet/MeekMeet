-- ============================================
-- 000041 — Admins can assign circle leaders
-- ============================================
-- The approval flow seats an approved leader in the circle created for
-- their claimed suburb. Until now only the circle's creator (shepherd_id)
-- could initialise circle_shepherds rows; admins insert on behalf of the
-- new leader.

CREATE POLICY "Admins can assign circle leaders"
  ON public.circle_shepherds FOR INSERT
  WITH CHECK (public.is_app_admin());
