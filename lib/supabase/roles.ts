/** Role guards for admin surfaces (Phase 1b). */
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userProfiles } from "@/lib/db/schema";
import { createServerClientNow } from "./server";

export type Role = "viewer" | "editor" | "admin";

const RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };

/** Current role for the signed-in user, or null when anonymous. */
export async function getCurrentRole(): Promise<Role | null> {
  const supabase = await createServerClientNow();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const [row] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.email, user.email.trim().toLowerCase()))
    .limit(1);
  return (row?.role as Role) ?? null;
}

/**
 * Assert the current user has a role of at least `required`.
 * Anonymous users are redirected to /login; authenticated users below the
 * required rank get redirected to /admin (denied-by-default).
 */
export async function requireRole(required: Role): Promise<Role> {
  const role = await getCurrentRole();
  if (!role) {
    redirect("/login");
  }
  if (RANK[role] < RANK[required]) {
    redirect("/admin/denied");
  }
  return role;
}
