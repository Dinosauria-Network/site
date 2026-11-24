import { requireRole } from "@/lib/supabase/roles";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";

/** Admin Categories list (Phase 5). */
export default async function AdminCategoriesPage() {
  await requireRole("editor");
  const cats = await db
    .select({ id: categories.id, name: categories.name, parentId: categories.parentId, createdAt: categories.createdAt })
    .from(categories)
    .orderBy(desc(categories.createdAt));

  return (
    <AdminLayout>
      <AdminHeader />
      <AdminNav />
      <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Categories", href: "/admin/categories" }]} />
      <main className="admin-main">
        <section className="admin-section">
          <h2 className="admin-section-title">Categories</h2>
          <table className="admin-table">
            <thead>
              <tr><th>Name</th><th>Parent</th><th>Created</th></tr>
            </thead>
            <tbody>
              {cats.length === 0 ? (
                <tr><td colSpan={3} style={{ color: "#66594F" }}>No categories.</td></tr>
              ) : (
                cats.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.parentId ? "yes" : "—"}</td>
                    <td>{c.createdAt ? new Date(c.createdAt).toLocaleString("en-US", { year: "numeric", month: "short" }) : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
      <AdminFooter />
    </AdminLayout>
  );
}
