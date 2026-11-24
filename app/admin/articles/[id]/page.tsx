import { requireRole } from "@/lib/supabase/roles";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { editorialStories } from "@/lib/db/schema";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminNav from "@/components/admin/AdminNav";
import AdminFooter from "@/components/admin/AdminFooter";
import ArticleEditor from "@/components/admin/ArticleEditor";

interface StoryParams {
  id: string;
}

/** Admin Article editor (Phase 5). */
export default async function AdminArticleEditorPage({
  params,
}: {
  params: Promise<StoryParams>;
}) {
  await requireRole("editor");
  const { id } = await params;

  const story = await db
    .select({
      id: editorialStories.id,
      slug: editorialStories.slug,
      headline: editorialStories.headline,
      description: editorialStories.description,
      deck: editorialStories.deck,
      status: editorialStories.status,
      publishedAt: editorialStories.publishedAt,
    })
    .from(editorialStories)
    .where(eq(editorialStories.id, id))
    .limit(1);

  if (!story.length) {
    return <div className="admin-section">Story not found.</div>;
  }

  return (
    <>
      <AdminHeader />
      <AdminNav />
      <AdminBreadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Articles", href: "/admin/articles" },
          { label: story[0].headline.slice(0, 40) },
        ]}
      />
      <main className="admin-main">
        <h2 className="admin-section-title">Edit article</h2>
        <ArticleEditor
          story={{
            id: story[0].id,
            slug: story[0].slug,
            headline: story[0].headline,
            deck: story[0].deck ?? null,
            description: story[0].description ?? null,
            status: story[0].status ?? 'draft',
            publishedAt: story[0].publishedAt ? story[0].publishedAt.toISOString() : null,
          }}
        />
      </main>
      <AdminFooter />
    </>
  );
}
