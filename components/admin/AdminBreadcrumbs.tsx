import Link from "next/link";

interface Segment {
  label: string;
  href?: string;
}

export default function AdminBreadcrumbs({ items }: { items: Segment[] }) {
  return (
    <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={item.label}>
          {item.href ? (
            <Link href={item.href} className="admin-breadcrumbs-link">
              {item.label}
            </Link>
          ) : (
            item.label
          )}
          {i < items.length - 1 && <span className="admin-breadcrumb-sep" />}
        </span>
      ))}
    </nav>
  );
}
