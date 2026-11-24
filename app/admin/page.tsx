import { requireRole } from "@/lib/supabase/roles";

export const metadata = { title: "Admin — Dinosauria" };

/**
 * Admin dashboard (Phase 5). Until the editorial admin UI lands, this is the
 * authenticated entry point — it proves the gate (requireRole) and shows who
 * you are. Full dashboard UI is coming.
 */
export default async function AdminDashboardPage() {
  const role = await requireRole("viewer");
  return (
    <main>
      <h1>Admin</h1>
      <p>Signed in. Role: <strong>{role}</strong></p>
      <ul>
        <li><a href="/admin/articles">Articles</a></li>
      </ul>
    </main>
  );
}
