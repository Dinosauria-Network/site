import Link from "next/link";

interface Segment {
  label: string;
  href?: string;
}

export default function AdminBreadcrumbs({ items }: { items: Segment[] }) {
  return (
    <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.label}>
            {item.href ? (
              <Link href={item.href} className="admin-breadcrumbs-link" aria-current={isLast ? "page" : undefined}>
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? "page" : undefined}>{item.label}</span>
            )}
            {i < items.length - 1 && <span className="admin-breadcrumb-sep" aria-hidden="true" />}
          </span>
        );
      })}
    </nav>
  );
}
