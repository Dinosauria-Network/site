/** Role guards for admin surfaces (Phase 1b). */
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userProfiles } from "@/lib/db/schema";
import { createServerClientNow } from "./server";

export type Role = "viewer" | "editor" | "admin";

const RANK: Record<Role, number> = { viewer: 0, editor: 1, admin: 2 };

/**
 * The signed-in user, plus the reason there isn't one.
 *
 * `getCurrentRole()` returning null used to mean three different things
 * (anonymous / Supabase error / no profile row) and `requireRole` sent all
 * three to `/login` — so a perfectly valid session with a missing profile row
 * looped the user through sign-in forever. Keep the error so the caller can
 * tell them apart.
 */
export async function getSessionUser() {
  const supabase = await createServerClientNow();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

/** Role row for an email, or null when the user has no profile row yet. */
export async function getRoleForEmail(email: string): Promise<Role | null> {
  const [row] = await db
    .select({ role: userProfiles.role })
    .from(userProfiles)
    .where(eq(userProfiles.email, email.trim().toLowerCase()))
    .limit(1);
  return (row?.role as Role) ?? null;
}

/** Current role for the signed-in user, or null when anonymous / unprofiled. */
export async function getCurrentRole(): Promise<Role | null> {
  const { user } = await getSessionUser();
  if (!user?.email) return null;
  return getRoleForEmail(user.email);
}

/**
 * Assert the current user has a role of at least `required`.
 *
 * Anonymous users are redirected to /login with a `diagnostic` that names the
 * failing layer; authenticated users below the required rank go to
 * /admin/denied. An authenticated user with no `user_profiles` row is sent to
 * /login with `diagnostic=no-profile` — a different message, because signing in
 * again will not fix it.
 */
export async function requireRole(required: Role): Promise<Role> {
  const { user, error } = await getSessionUser();

  if (!user) {
    redirect(
      `/login?diagnostic=${error ? "getuser-error" : "rsc-no-session"}`
    );
  }

  const role = user.email ? await getRoleForEmail(user.email) : null;
  if (!role) {
    redirect("/login?diagnostic=no-profile");
  }

  if (RANK[role] < RANK[required]) {
    redirect("/admin/denied");
  }
  return role;
}
