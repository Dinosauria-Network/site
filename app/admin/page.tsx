import { adminStats } from "@/lib/admin/dashboard";
import { requireRole } from "@/lib/supabase/roles";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";
import { BarList, DailyBars } from "@/components/admin/AdminCharts";

const LINKS = [
  { href: "/admin/articles", label: "Articles", note: "Editorial stories and papers" },
  { href: "/admin/sources", label: "Sources", note: "Publication source management" },
  { href: "/admin/categories", label: "Categories", note: "Chronostratographic-free curation" },
  { href: "/admin/images", label: "Images", note: "Image management" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  approved: "Approved",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

const STATUS_TONES: Record<string, "accent" | "muted" | "gold" | "danger"> = {
  draft: "muted",
  pending_review: "gold",
  approved: "gold",
  published: "accent",
  rejected: "danger",
  archived: "muted",
};

/** The auto-publish gate (editorial:autopublish --min-score). */
const AUTOPUBLISH_GATE = 0.75;

/** Admin dashboard — corpus totals, pipeline, ingestion trend and what needs attention. */
export default async function AdminDashboardPage() {
  const role = await requireRole("viewer");
  const stats = await adminStats();
  const { totals, attention } = stats;

  const pipeline = stats.pipeline.map((p) => ({
    key: p.status,
    label: STATUS_LABELS[p.status] ?? p.status,
    value: p.count,
    href: `/admin/articles?status=${encodeURIComponent(p.status)}`,
    tone: STATUS_TONES[p.status] ?? "muted",
  }));

  const scored = stats.scores.reduce((sum, b) => sum + b.count, 0);
  const scores = stats.scores.map((b) => ({
    key: String(b.from),
    label: `${b.from.toFixed(1)}–${(b.from + 0.1).toFixed(1)}`,
    value: b.count,
    // The publishable end of the range, so the tail stands out from the bulk.
    tone: (b.from >= 0.7 ? "accent" : "muted") as "accent" | "muted",
  }));

  return (
    <>
      <AdminHeader />
      <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }]} />
      <AdminNav />
      <main className="admin-main">
        <section className="admin-section">
          <h2 className="admin-section-title">Dashboard</h2>
          <p className="admin-lede">Signed in as {role}.</p>
          <ul className="admin-totals">
            <li>
              <span className="admin-totals-value">{totals.papers.toLocaleString("en-US")}</span>
              <span className="admin-totals-label">Papers</span>
            </li>
            <li>
              <span className="admin-totals-value">{totals.stories.toLocaleString("en-US")}</span>
              <span className="admin-totals-label">Stories</span>
            </li>
            <li>
              <span className="admin-totals-value">{totals.images.toLocaleString("en-US")}</span>
              <span className="admin-totals-label">Images</span>
            </li>
            <li>
              <span className="admin-totals-value">{totals.sources.toLocaleString("en-US")}</span>
              <span className="admin-totals-label">Sources</span>
            </li>
          </ul>
        </section>

        <div className="admin-dash-grid">
          <section className="admin-section">
            <h2 className="admin-section-title">Pipeline</h2>
            <p className="admin-chart-note">Stories by editorial status.</p>
            <BarList rows={pipeline} unit="stories" />
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Ingestion</h2>
            <p className="admin-chart-note">Papers added per day (ingest runs overnight UTC).</p>
            <DailyBars days={stats.ingestion.days} />
          </section>

          <section className="admin-section">
            <h2 className="admin-section-title">Editorial score distribution</h2>
            <p className="admin-chart-note">
              {scored.toLocaleString("en-US")} scored papers, in tenths. Buckets from 0.7 up are shaded; the
              auto-publish gate is {AUTOPUBLISH_GATE.toFixed(2)}.
            </p>
            <BarList rows={scores} unit="papers" />
          </section>
        </div>

        <section className="admin-section">
          <h2 className="admin-section-title">Needs attention</h2>
          <dl className="admin-attention">
            <div>
              <dt>Drafts without an image</dt>
              <dd><a href="/admin/articles?status=draft&image=none">{attention.draftsWithoutImage.toLocaleString("en-US")}</a></dd>
            </div>
            <div>
              <dt>Image references with no file</dt>
              <dd><a href="/admin/articles?image=missing">{attention.deadImageRefs.toLocaleString("en-US")}</a></dd>
            </div>
            <div>
              <dt>Assets pending verification</dt>
              <dd><a href="/admin/images">{attention.pendingAssets.toLocaleString("en-US")}</a></dd>
            </div>
            <div>
              <dt>Unscored papers</dt>
              <dd>{attention.unscoredPapers.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Published in the last 30 days</dt>
              <dd><a href="/admin/articles?status=published">{attention.publishedLast30.toLocaleString("en-US")}</a></dd>
            </div>
          </dl>
        </section>

        <section className="admin-section">
          <h2 className="admin-section-title">Quick links</h2>
          <ul className="admin-quicklinks">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
                <span>{l.note}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <AdminFooter />
    </>
  );
}
