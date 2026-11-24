import { adminStats } from "@/lib/admin/stats";
import { requireRole } from "@/lib/supabase/roles";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNav from "@/components/admin/AdminNav";

import AdminFooter from "@/components/admin/AdminFooter";

const LINKS = [
  { href: "/admin/articles", label: "Articles", note: "Editorial stories and papers" },
  { href: "/admin/sources", label: "Sources", note: "Publication source management" },
  { href: "/admin/categories", label: "Categories", note: "Chronostratographic-free curation" },
  { href: "/admin/images", label: "Images", note: "Image management" },
] as const;

/** Admin dashboard — quick entry links + corpus stats. */
export default async function AdminDashboardPage() {
  const role = await requireRole("viewer");
  const stats = await adminStats();

  return (
    <>
      <AdminHeader />
      <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }]} />
      <AdminNav />
      <main className="admin-main">
        <section className="admin-section">
          <h2 className="admin-section-title">Welcome back, {role}</h2>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <span className="admin-btn" style={{ cursor: "default" }}>
              Papers: {stats.papers.toLocaleString("en-US")}
            </span>
            <span className="admin-btn" style={{ cursor: "default" }}>
              Stories: {Object.values(stats.stories).reduce((a, b) => a + b, 0).toLocaleString("en-US")}
            </span>
            <span className="admin-btn" style={{ cursor: "default" }}>
              Images: {stats.imageCount.toLocaleString("en-US")}
            </span>
            <span className="admin-btn" style={{ cursor: "default" }}>
              Sources: {stats.sourceCount.toLocaleString("en-US")}
            </span>
          </div>
        </section>

        <section className="admin-section">
          <h2 className="admin-section-title">Quick links</h2>
          <ul style={{ listStyle: "none", padding: 0, display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {LINKS.map((l) => (
              <li key={l.href} style={{ textAlign: "center" }}>
                <a href={l.href} style={{ fontSize: "1rem", fontWeight: 700 }}>{l.label}</a>
                <div style={{ fontSize: "0.75rem", color: "#66594F" }}>{l.note}</div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <AdminFooter />
    </>
  );
}
