import { requireRole } from "@/lib/supabase/roles";
import { db } from "@/lib/db/client";
import { editorialStories } from "@/lib/db/schema";
import { desc, eq, ilike, sql, and } from "drizzle-orm";
import { readStoryImage } from "@/lib/admin/story-image";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";
import Pagination from "@/components/admin/Pagination";
import ArticlesListClient, { type StoryLite } from "@/components/admin/ArticlesListClient";

const PAGE_SIZE = 50;
const STATUSES = ["draft", "pending_review", "approved", "published", "rejected", "archived"];
/** How many stories the image filter may scan before paginating in memory. */
const MAX_FILTER_ROWS = 2000;

type ImageFilter = "all" | "missing" | "none";

/** The columns this page selects, plus the body it derives the image from. */
interface StoryRow {
  id: string;
  slug: string;
  headline: string;
  deck: string | null;
  status: StoryLite["status"];
  publishedAt: Date | null;
  updatedAt: Date | null;
  body: unknown;
}

interface SearchParams {
  q?: string;
  status?: string;
  image?: string;
  page?: string;
}

/** Admin Articles list (Phase 5) — search + status/image filter + pagination. */
export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const role = await requireRole("editor");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status && STATUSES.includes(params.status) ? params.status : "all";
  const imageFilter: ImageFilter =
    params.image === "missing" || params.image === "none" ? params.image : "all";
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where = and(
    status !== "all" ? eq(editorialStories.status, status as any) : undefined,
    q ? ilike(editorialStories.headline, `%${q}%`) : undefined
  );

  const columns = {
    id: editorialStories.id,
    slug: editorialStories.slug,
    headline: editorialStories.headline,
    deck: editorialStories.deck,
    status: editorialStories.status,
    publishedAt: editorialStories.publishedAt,
    updatedAt: editorialStories.updatedAt,
    body: editorialStories.body,
  };

  // The public site renders `body.image`, so the list previews the same field
  // (existence-checked) instead of the media_assets ledger.
  const toStory = (row: StoryRow): StoryLite => {
    const { body, ...rest } = row;
    const image = readStoryImage(body);
    const source = (body as { source?: unknown } | null)?.source;
    return {
      ...rest,
      source: typeof source === "string" && source.trim() !== "" ? source.trim() : null,
      imageSrc: image.src,
      imageStatus: image.status,
    };
  };

  let stories: StoryLite[];
  let total: number;
  let pageCount: number;

  if (imageFilter === "all") {
    const rows = await db
      .select(columns)
      .from(editorialStories)
      .where(where)
      .orderBy(desc(editorialStories.updatedAt ?? editorialStories.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);
    stories = rows.map(toStory);

    const [countRow] = await db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(editorialStories)
      .where(where);
    total = countRow?.value ?? 0;
    pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  } else {
    // Whether a file is actually on disk needs the filesystem, which SQL can't
    // see — so scan the matching stories and paginate in memory. `missing` here
    // means the reference is dead (or unreadable on disk), matching the
    // dashboard's "image references with no file" count.
    const candidates = await db
      .select(columns)
      .from(editorialStories)
      .where(where)
      .orderBy(desc(editorialStories.updatedAt ?? editorialStories.createdAt))
      .limit(MAX_FILTER_ROWS);
    const filtered = candidates
      .map(toStory)
      .filter((s) => (imageFilter === "missing" ? s.imageStatus === "missing" : s.imageStatus === "none"));

    total = filtered.length;
    pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    stories = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }

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
          <ArticlesListClient
            stories={stories}
            query={q}
            status={status}
            image={imageFilter}
            page={page}
          />
          <Pagination
            page={page}
            pageCount={pageCount}
            buildHref={(p) =>
              `/admin/articles?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}${
                status !== "all" ? `&status=${status}` : ""
              }${imageFilter !== "all" ? `&image=${imageFilter}` : ""}`
            }
          />
        </section>
      </main>
      <AdminFooter />
    </>
  );
}
