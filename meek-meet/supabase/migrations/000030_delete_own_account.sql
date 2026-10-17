-- 000030_delete_own_account.sql
-- In-app account deletion (Apple App Store requirement, and good practice
-- everywhere). A signed-in user can permanently delete their own account.
-- Personal data in tables without ON DELETE CASCADE is purged explicitly;
-- deleting the auth.users row cascades profiles, responses, circle_shepherds,
-- shepherd_application_documents, sessions and identities.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Personal data in tables that have no (or SET NULL) FK to auth.users.
  -- These must be removed explicitly so no personal rows survive.
  DELETE FROM public.admin_messages WHERE user_id = uid;
  DELETE FROM public.rsvps WHERE user_id = uid;
  -- application documents cascade from shepherd_applications
  DELETE FROM public.shepherd_applications WHERE user_id = uid;
  DELETE FROM public.generated_questions WHERE generated_by = uid;

  -- Profile photo from storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
    AND (name = uid::text OR name LIKE uid::text || '/%');

  -- Deleting the auth user cascades: profiles, responses, circle_shepherds,
  -- shepherd_application_documents, auth.sessions, auth.identities.
  -- authority_submissions.reports SET NULL / keep anonymised institutional
  -- records, per the privacy policy.
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
