"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./navigation.module.css";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/genera", label: "Genera" },
  { href: "/phylogeny", label: "Phylogeny" },
  { href: "/mesozoic", label: "Mesozoic Era" },
  { href: "/about", label: "About" },
  { href: "/search", label: "Search" },
  { href: "/news", label: "News" },
];

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className={styles['main-navigation']} aria-label="Main Navigation">
      <button
        type="button"
        className={`${styles['menu-toggle']} menu-toggle`}
        aria-expanded={menuOpen}
        aria-controls="primary-menu"
        aria-label="Toggle navigation"
        onClick={() => setMenuOpen((prev) => !prev)}
        onBlur={(e) => {
          const related = e.relatedTarget as HTMLElement | null;
          if (!related || !related.closest(".nav")) setMenuOpen(false);
        }}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div className="menu-all-pages-container">
        <ul
          id="primary-menu"
          className={`nav${menuOpen ? " open" : ""}`}
        >
          {navItems.map((item) => (
            <li
              key={item.href}
              className={`menu-item${pathname === item.href ? " current-menu-item current_page_item" : ""}`}
            >
              <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ))}
          <li className="menu-item">
            <Link href="/feed.xml">RSS Feed</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
