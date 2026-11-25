// The master admin identity. Must match the hardcoded value in:
//   - supabase/migrations/000025 (handle_new_user_admin bootstrap)
//   - supabase/migrations/000031 (is_master_admin RPC)
// If this ever changes, change it in all three places.
export const MASTER_ADMIN_EMAIL = "meekmeets@gmail.com";

export function isMasterEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.trim().toLowerCase() === MASTER_ADMIN_EMAIL;
}
