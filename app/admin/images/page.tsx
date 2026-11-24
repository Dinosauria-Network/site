import { requireRole } from "@/lib/supabase/roles";
import { db } from "@/lib/db/client";
import { mediaAssets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";
import AssetReuseControl from "@/components/admin/AssetReuseControl";

interface Props {
  assets: {
    id: string;
    storagePath: string | null;
    caption: string | null;
    licenseName: string | null;
    copyrightHolder: string | null;
    reuseStatus: string;
  }[];
}

/** Admin Images page (Phase 5). */
export default async function AdminImagesPage() {
  await requireRole("editor");
  const assets = await db
    .select({
      id: mediaAssets.id,
      storagePath: mediaAssets.storagePath,
      caption: mediaAssets.caption,
      licenseName: mediaAssets.licenseName,
      copyrightHolder: mediaAssets.copyrightHolder,
      reuseStatus: mediaAssets.reuseStatus,
    })
    .from(mediaAssets);

  return (
    <AdminLayout>
      <AdminHeader />
      <AdminNav />
      <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Images", href: "/admin/images" }]} />
      <main className="admin-main">
        <section className="admin-section">
          <h2 className="admin-section-title">Image management</h2>
          <table className="admin-table">
            <thead>
              <tr><th>File</th><th>License</th><th>Holder</th><th>Reuse status</th></tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr><td colSpan={4} style={{ color: "#66594F" }}>No assets.</td></tr>
              ) : (
                assets.map((a) => {
                  const file = (a.storagePath ?? "").split("/").pop() || "(no file)";
                  return (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600, maxWidth: "30vw" }}>{file}</td>
                      <td>{a.licenseName ?? "—"}</td>
                      <td>{a.copyrightHolder ?? "—"}</td>
                      <td>
                        <AssetReuseControl assetId={a.id} status={a.reuseStatus} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </main>
      <AdminFooter />
    </AdminLayout>
  );
}
