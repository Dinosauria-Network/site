import { requireRole } from "@/lib/supabase/roles";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { editorialStories, mediaAssets } from "@/lib/db/schema";
import { readStoryImage } from "@/lib/admin/story-image";
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
      paperId: editorialStories.paperId,
      body: editorialStories.body,
    })
    .from(editorialStories)
    .where(eq(editorialStories.id, id))
    .limit(1);

  if (!story.length) {
    return (
      <>
        <AdminHeader />
        <AdminNav />
        <AdminBreadcrumbs items={[{ label: "Admin", href: "/admin" }, { label: "Articles", href: "/admin/articles" }, { label: "Not found" }]} />
        <main className="admin-main">
          <section className="admin-section">
            <h2 className="admin-section-title">Story not found</h2>
            <p style={{ margin: "0 0 1rem", color: "#66594F" }}>The article you are trying to edit does not exist (or was deleted).</p>
            <a className="admin-btn" href="/admin/articles">Back to articles</a>
          </section>
        </main>
        <AdminFooter />
      </>
    );
  }

  // The reader-facing image is `body.image`; media_assets supplies the
  // provenance (licence, credit, verification) that the public page doesn't show.
  const bodyImage = readStoryImage(story[0].body);
  const assets = story[0].paperId
    ? await db
        .select({
          storagePath: mediaAssets.storagePath,
          caption: mediaAssets.caption,
          licenseName: mediaAssets.licenseName,
          licenseUrl: mediaAssets.licenseUrl,
          copyrightHolder: mediaAssets.copyrightHolder,
          reuseStatus: mediaAssets.reuseStatus,
        })
        .from(mediaAssets)
        .where(eq(mediaAssets.paperId, story[0].paperId))
    : [];
  // Prefer the row describing the image the story actually uses — a paper can
  // accumulate several assets over time, and stale ones would show a wrong licence.
  const asset =
    assets.find((a) => a.storagePath && a.storagePath === bodyImage.referenced) ?? assets[0];

  const assetImage = readStoryImage({ image: asset?.storagePath });
  // Only fall back to the asset ledger when the story never got an image at all;
  // a *broken* body.image is a real problem the editor should surface, not mask.
  const fallbackSrc = bodyImage.status === "none" ? assetImage.src : null;
  const imageSrc = bodyImage.src ?? fallbackSrc;
  const imageReferenced = bodyImage.referenced ?? (fallbackSrc ? assetImage.referenced : null);
  const image = {
    src: imageSrc,
    referenced: imageReferenced,
    status: imageSrc ? ("ok" as const) : imageReferenced ? ("missing" as const) : ("none" as const),
    caption: asset?.caption ?? null,
    licenseName: asset?.licenseName ?? null,
    licenseUrl: asset?.licenseUrl ?? null,
    credit: asset?.copyrightHolder ?? null,
    reuseStatus: asset?.reuseStatus ?? null,
  };

  const bodySource = (story[0].body as { source?: unknown } | null)?.source;
  const bodyUrl = (story[0].body as { url?: unknown } | null)?.url;

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
            source: typeof bodySource === "string" && bodySource.trim() !== "" ? bodySource.trim() : null,
            originalUrl: typeof bodyUrl === "string" && bodyUrl.trim() !== "" ? bodyUrl.trim() : null,
            publishedAt: story[0].publishedAt ? story[0].publishedAt.toISOString() : null,
          }}
          image={image}
        />
      </main>
      <AdminFooter />
    </>
  );
}
