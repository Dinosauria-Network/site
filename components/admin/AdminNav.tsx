"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/sources", label: "Sources" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/images", label: "Images" },
] as const;

export default function AdminNav() {
  const pathname = usePathname() || "/admin";
  return (
    <nav className="admin-nav" aria-label="Admin">
      {ADMIN_LINKS.map((l) => {
        const active = pathname === l.href || (l.href !== "/admin" && pathname.startsWith(l.href + "/"));
        return (
          <Link key={l.href} href={l.href} className={active ? "admin-nav-link admin-nav-link-active" : "admin-nav-link"}>
            {l.label}
          </Link>
        );
      })}
      <Link href="/logout" className="admin-btn admin-btn-danger" style={{ marginLeft: "auto" }}>
        Sign out
      </Link>
    </nav>
  );
}
