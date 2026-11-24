import { requireRole } from "@/lib/supabase/roles";
import { db } from "@/lib/db/client";
import { editorialStories, mediaAssets } from "@/lib/db/schema";
import { desc, eq, ilike, sql, and, inArray } from "drizzle-orm";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";
import Pagination from "@/components/admin/Pagination";
import ArticlesListClient from "@/components/admin/ArticlesListClient";

const PAGE_SIZE = 50;
const STATUSES = ["draft", "pending_review", "published", "rejected"];

interface SearchParams {
  q?: string;
  status?: string;
  page?: string;
}

/** Admin Articles list (Phase 5) — search + status filter + pagination. */
export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const role = await requireRole("editor");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status && STATUSES.includes(params.status) ? params.status : "all";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where = and(
    status !== "all" ? eq(editorialStories.status, status as any) : undefined,
    q ? ilike(editorialStories.headline, `%${q}%`) : undefined
  );

  const rows = await db
    .select({
      id: editorialStories.id,
      slug: editorialStories.slug,
      headline: editorialStories.headline,
      deck: editorialStories.deck,
      status: editorialStories.status,
      publishedAt: editorialStories.publishedAt,
      updatedAt: editorialStories.updatedAt,
      paperId: editorialStories.paperId,
    })
    .from(editorialStories)
    .where(where)
    .orderBy(desc(editorialStories.updatedAt ?? editorialStories.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const paperIds = rows.map((r) => r.paperId).filter((p): p is string => Boolean(p));
  const imageRows = paperIds.length > 0
    ? await db
        .select({ paperId: mediaAssets.paperId, src: mediaAssets.storagePath ?? mediaAssets.originalUrl })
        .from(mediaAssets)
        .where(inArray(mediaAssets.paperId, paperIds))
    : [];
  const imagesByPaper: Record<string, string> = {};
  for (const a of imageRows) {
    if (a.paperId && a.src) imagesByPaper[a.paperId] = a.src;
  }

  const [{ value: total }] = await db
    .select({ value: sql<number>`count(*)`.mapWith(Number) })
    .from(editorialStories)
    .where(where);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Articles", href: "/admin/articles" },
  ];

  return (
    <>
      <AdminHeader />
      <AdminNav />
      <AdminBreadcrumbs items={breadcrumbs} />
      <main className="admin-main">
        <section className="admin-section">
          <h2 className="admin-section-title">Articles</h2>
          <p style={{ margin: "0 0 1rem", color: "#66594F" }}>
            {total} {total === 1 ? "story" : "stories"} · role: {role}
          </p>
          <ArticlesListClient stories={rows as never} query={q} status={status} page={page} imagesByPaper={imagesByPaper} />
          <Pagination
            page={page}
            pageCount={pageCount}
            buildHref={(p) => `/admin/articles?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}${status !== "all" ? `&status=${status}` : ""}`}
          />
        </section>
      </main>
      <AdminFooter />
    </>
  );
}
