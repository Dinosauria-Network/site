import Link from "next/link";

interface PostsPaginationProps {
  basePath: string;
  currentPage: number;
  totalPages: number;
}

export default function PostsPagination({
  basePath,
  currentPage,
  totalPages,
}: PostsPaginationProps) {
  if (totalPages <= 1) return null;

  const root = basePath || "/";
  const previousHref = `${root}?page=${currentPage - 1}`;
  const nextHref = `${root}?page=${currentPage + 1}`;

  return (
    <nav className="navigation posts-navigation" aria-label="Posts">
      <h2 className="screen-reader-text">Posts navigation</h2>
      <div className="nav-links">
        {currentPage > 1 && (
          <div className="nav-previous">
            <Link href={previousHref}>Newer posts</Link>
          </div>
        )}
        {currentPage < totalPages && (
          <div className="nav-next">
            <Link href={nextHref}>Older posts</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
