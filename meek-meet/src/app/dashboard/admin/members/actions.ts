"use server";

import { createClient } from "@/lib/supabase/server";

export interface MemberEntry {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  location: string | null;
  created_at: string;
}

export async function getMembers(search?: string): Promise<MemberEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Not authorized");

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, location, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const term = search?.trim();
  if (term) {
    query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
