/** Sync a Supabase auth user into the local `user_profiles` table (Phase 1b). */
import { db } from "@/lib/db/client";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: { name?: string; full_name?: string; provider_id?: string } | null;
}

/** Upsert a user by email. First signup gets role='admin'; existing users keep their role. */
export async function syncUserToProfiles(user: AuthUserLike): Promise<string | null> {
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return null;
  const existing = await db
    .select({ id: userProfiles.id, role: userProfiles.role, displayName: userProfiles.displayName })
    .from(userProfiles)
    .where(eq(userProfiles.email, email))
    .limit(1);
  if (existing.length) return existing[0].id;

  // First signup (no row yet) → admin, per the site's chosen default.
  const inserted = await db
    .insert(userProfiles)
    .values({
      email,
      displayName: user.user_metadata?.name || user.user_metadata?.full_name || user.email || undefined,
      role: "admin",
    })
    .returning({ id: userProfiles.id, role: userProfiles.role });
  return inserted[0]?.id ?? null;
}
