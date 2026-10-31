import { getPostsPaginated } from "@/lib/genus-data";
import Link from "next/link";
import ArticleCard from "@/components/ArticleCard";
import MasonryGrid from "@/components/MasonryGrid";

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

      {totalPages > 1 && (
        <nav className="navigation posts-navigation" aria-label="Posts">
          <h2 className="screen-reader-text">Posts navigation</h2>
          <div className="nav-links">
            {currentPage > 1 && (
              <div className="nav-previous">
                <Link href={`/?page=${currentPage - 1}`}>Newer posts</Link>
              </div>
            )}
            {currentPage < totalPages && (
              <div className="nav-next">
                <Link href={`/?page=${currentPage + 1}`}>Older posts</Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </MasonryGrid>
  );
}
