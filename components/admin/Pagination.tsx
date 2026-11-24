/** Simple pagination controls (Phase 5). */
interface PaginationProps {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}

export default function Pagination({ page, pageCount, buildHref }: PaginationProps) {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <nav className="admin-pager">
      {pages.map((p) =>
        p === page ? (
          <span key={p} style={{ fontWeight: 600 }}>{p}</span>
        ) : (
          <a key={p} href={buildHref(p)}>{p}</a>
        )
      )}
    </nav>
  );
}
