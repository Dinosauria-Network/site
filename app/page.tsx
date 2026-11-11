import { getPublishedStoriesPaginated } from "@/lib/db/stories";
import { previewValue } from "@/lib/preview";
import ArticleCard from "@/components/ArticleCard";
import MasonryGrid from "@/components/MasonryGrid";
import PostsPagination from "@/components/PostsPagination";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const metadata = {
  title: `${SITE_NAME} – ${SITE_TAGLINE}`,
  description:
    `${SITE_TAGLINE} - Latest dinosaur news and paleontology discoveries`,
};

export const revalidate = 3600;

const PER_PAGE = 10;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10) || 1);
  const preview = previewValue(sp);
  const { posts, totalPages, currentPage } = await getPublishedStoriesPaginated(
    page,
    PER_PAGE,
    { includeDrafts: preview !== null }
  );

  return (
    <MasonryGrid>
      <div className="page-header" />
      {posts.map((post, index) => (
        <ArticleCard key={post.id} post={post} index={index} preview={preview ?? undefined} />
      ))}

        <PostsPagination
          basePath=""
          currentPage={currentPage}
          totalPages={totalPages}
        />
    </MasonryGrid>
  );
}
