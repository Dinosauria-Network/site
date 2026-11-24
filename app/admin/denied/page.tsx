import { requireRole } from "@/lib/supabase/roles";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";

/** Shown to authenticated users below admin-required rank. */
export default async function AdminDeniedPage() {
  const role = await requireRole("admin").catch(() => "none");
  return (
    <>
      <AdminHeader />
      <AdminNav />
      <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Denied" }]} />
      <main className="admin-main">
        <section className="admin-section">
          <h2 className="admin-section-title">Not authorized</h2>
          <p>Your role ({role}) doesn't have access here. Only editors and admins can reach this area.</p>
        </section>
      </main>
      <AdminFooter />
    </>
  );
}
