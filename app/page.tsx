import { getPostsPaginated } from "@/lib/genus-data";
import ArticleCard from "@/components/ArticleCard";
import MasonryGrid from "@/components/MasonryGrid";
import PostsPagination from "@/components/PostsPagination";

export const metadata = {
  title: "Dinosauria Network – Dispensing your daily dose of dinosaurs",
  description:
    "Dispensing your daily dose of dinosaurs - Latest dinosaur news and paleontology discoveries",
};

const PER_PAGE = 10;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(String(sp.page || "1"), 10) || 1);
    const { posts, totalPages, currentPage } = getPostsPaginated(
    page,
    PER_PAGE
  );

  return (
    <MasonryGrid>
      <div className="page-header" />

      {posts.map((post, index) => (
        <ArticleCard key={post.id} post={post} index={index} />
      ))}

      <PostsPagination
        basePath=""
        currentPage={currentPage}
        totalPages={totalPages}
      />
    </MasonryGrid>
  );
}
