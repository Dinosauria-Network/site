import { requireRole } from "@/lib/supabase/roles";
import { db } from "@/lib/db/client";
import { sourceRegistry, ingestionRuns } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";
import StatusBadge from "@/components/admin/StatusBadge";

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—");

/** Admin Sources list (Phase 5). */
export default async function AdminSourcesPage() {
  await requireRole("editor");
  const sources = await db.select().from(sourceRegistry).orderBy(desc(sourceRegistry.lastRunAt));
  const runs = await db
    .select({ source: ingestionRuns.source, status: ingestionRuns.status, startedAt: ingestionRuns.startedAt })
    .from(ingestionRuns)
    .orderBy(desc(ingestionRuns.startedAt))
    .limit(10);

  return (
    <>
      <AdminHeader />
      <AdminNav />
      <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Sources", href: "/admin/sources" }]} />
      <main className="admin-main">
        <section className="admin-section">
          <h2 className="admin-section-title">Publication sources</h2>
          <table className="admin-table">
            <thead>
              <tr><th>Source</th><th>Status</th><th>Last run</th></tr>
            </thead>
            <tbody>
              {sources.length === 0 ? (
                <tr><td colSpan={3} style={{ color: "#66594F" }}>No sources.</td></tr>
              ) : (
                sources.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.displayName}</td>
                    <td><StatusBadge status={s.enabled ? "enabled" : "disabled"} /></td>
                    <td>{fmt(s.lastRunAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {runs.length > 0 && (
            <>
              <h3 className="admin-section-title" style={{ marginTop: "1.5rem", fontSize: "1rem" }}>Recent ingestions</h3>
              <table className="admin-table">
                <thead><tr><th>Source</th><th>Status</th><th>Started</th></tr></thead>
                <tbody>
                  {runs.map((r, i) => (
                    <tr key={i}><td>{r.source}</td><td><StatusBadge status={r.status} /></td><td>{fmt(r.startedAt)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      </main>
      <AdminFooter />
    </>
  );
}
