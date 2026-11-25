-- ============================================
-- 000031 Dual Admin Invites
-- ============================================
-- The master admin (meekmeets@gmail.com — same identity bootstrapped by
-- handle_new_user_admin in 000025) can invite other admins. Invited admins
-- receive the SAME powers as the master (role = 'admin'); the ONLY things
-- reserved for the master are inviting and revoking admins.
--
-- Flow:
--   1. Master calls invite_admin(email) → pending row in admin_invites.
--   2. If that email already has a profile, they are promoted immediately and
--      the invite is marked accepted (return value 'promoted').
--   3. Otherwise the app sends an invite email; when the user signs up (or
--      their profile email is set), trg_accept_admin_invite promotes them
--      (return path 'invited').
--   4. revoke_admin(user_id) demotes an admin to member; revoke_admin_invite
--      cancels a pending invite. Both are master-only, like invite_admin.
--
-- Security model mirrors review_shepherd_application (000025): role writes go
-- through SECURITY DEFINER RPCs that flip the transaction-local
-- app.role_change_allowed switch past guard_profile_role. RLS on
-- admin_invites denies all direct access; every read/write goes through the
-- RPCs below.

-- ── 1. Invites table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ
);

COMMENT ON TABLE public.admin_invites IS 'Admin invitations; master-admin only. All access via RPC.';

-- At most one pending invite per email.
DROP INDEX IF EXISTS public.admin_invites_pending_email;
CREATE UNIQUE INDEX admin_invites_pending_email
  ON public.admin_invites (email)
  WHERE status = 'pending';

-- No direct API access — everything goes through the RPCs below.
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_invites FROM anon, authenticated;

-- ── 2. Master check ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND lower(email) = 'meekmeets@gmail.com'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_master_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;

-- ── 3. Auto-accept pending invites when a matching profile appears ──
-- Fires on profile INSERT (new signup) and on email changes. Promotes the
-- account to admin exactly when a pending invite matches the profile email.
CREATE OR REPLACE FUNCTION public.accept_admin_invite()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
  v_invite_id UUID;
BEGIN
  SELECT id INTO v_invite_id
  FROM public.admin_invites
  WHERE email = lower(NEW.email) AND status = 'pending'
  LIMIT 1;

  IF v_invite_id IS NOT NULL THEN
    PERFORM set_config('app.role_change_allowed', 'on', true);
    UPDATE public.profiles
    SET role = 'admin'
    WHERE id = NEW.id AND role <> 'admin';

    UPDATE public.admin_invites
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invite_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_accept_admin_invite ON public.profiles;
CREATE TRIGGER trg_accept_admin_invite
  AFTER INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.accept_admin_invite();

-- ── 4. invite_admin ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invite_admin(p_email TEXT)
RETURNS TEXT -- 'invited' (pending, email sent by the app) | 'promoted' (existing user)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
  v_email TEXT;
  v_profile RECORD;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'only the master admin can invite admins';
  END IF;

  v_email := lower(btrim(p_email));
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'invalid email address';
  END IF;
  IF v_email = 'meekmeets@gmail.com' THEN
    RAISE EXCEPTION 'the master admin is already an admin';
  END IF;

  -- Replace any previous pending invite for this email.
  UPDATE public.admin_invites
  SET status = 'revoked'
  WHERE email = v_email AND status = 'pending';

  SELECT id, role INTO v_profile
  FROM public.profiles
  WHERE lower(email) = v_email
  LIMIT 1;

  IF v_profile.id IS NOT NULL AND v_profile.role = 'admin' THEN
    RAISE EXCEPTION 'this user is already an admin';
  END IF;

  IF v_profile.id IS NOT NULL THEN
    -- Existing user: promote now and mark the invite accepted.
    PERFORM set_config('app.role_change_allowed', 'on', true);
    UPDATE public.profiles SET role = 'admin' WHERE id = v_profile.id;

    INSERT INTO public.admin_invites (email, invited_by, status, accepted_at)
    VALUES (v_email, auth.uid(), 'accepted', now());

    RETURN 'promoted';
  END IF;

  INSERT INTO public.admin_invites (email, invited_by, status)
  VALUES (v_email, auth.uid(), 'pending');

  RETURN 'invited';
END;
$$;

REVOKE ALL ON FUNCTION public.invite_admin(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_admin(TEXT) TO authenticated;

-- ── 5. revoke_admin ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.revoke_admin(p_user_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'only the master admin can revoke admins';
  END IF;

  SELECT lower(email) INTO v_email
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'user not found';
  END IF;
  IF v_email = 'meekmeets@gmail.com' THEN
    RAISE EXCEPTION 'the master admin cannot be revoked';
  END IF;

  PERFORM set_config('app.role_change_allowed', 'on', true);
  UPDATE public.profiles
  SET role = 'member'
  WHERE id = p_user_id AND role = 'admin';

  UPDATE public.admin_invites
  SET status = 'revoked'
  WHERE email = v_email AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_admin(UUID) TO authenticated;

-- ── 6. revoke_admin_invite (pending invites) ────────────────────
CREATE OR REPLACE FUNCTION public.revoke_admin_invite(p_invite_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'only the master admin can revoke invites';
  END IF;

  UPDATE public.admin_invites
  SET status = 'revoked'
  WHERE id = p_invite_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pending invite not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_admin_invite(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_admin_invite(UUID) TO authenticated;

-- ── 8. record_admin_invite_email_sent ───────────────────────────
-- Called by the app after the invite/grant email is dispatched so the
-- master can see exactly when each email went out.
CREATE OR REPLACE FUNCTION public.record_admin_invite_email_sent(p_email TEXT)
RETURNS void
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'only the master admin can manage invites';
  END IF;

  UPDATE public.admin_invites
  SET email_sent_at = now()
  WHERE email = lower(btrim(p_email))
    AND email_sent_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.record_admin_invite_email_sent(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_admin_invite_email_sent(TEXT) TO authenticated;

-- ── 7. get_admin_invites (master-only listing) ──────────────────
CREATE OR REPLACE FUNCTION public.get_admin_invites()
RETURNS TABLE (
  id UUID,
  email TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = ''
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'only the master admin can view invites';
  END IF;

  RETURN QUERY
  SELECT i.id, i.email, i.status, i.created_at, i.accepted_at, i.email_sent_at
  FROM public.admin_invites i
  ORDER BY i.created_at DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_invites() TO authenticated;
