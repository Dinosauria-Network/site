"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import styles from "./navigation.module.scss";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/mesozoic", label: "Mesozoic Era" },
  { href: "/phylogeny", label: "Phylogeny" },
  { href: "/genera", label: "Genera" },
  { href: "/about", label: "About" },
  { href: "/search", label: "News" },
];

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Close on ESC key (dialog handles this natively, but we keep for consistency)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  // Apply/remove body scroll lock when menu opens
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [menuOpen]);

  // Sync dialog with React state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (menuOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [menuOpen]);

  const handleToggle = () => setMenuOpen(!menuOpen);
  const handleClose = () => setMenuOpen(false);

  // Add 'hiding' class ONLY when the dialog starts closing
  const handleDialogClose = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.classList.add(styles.hiding);
    }
  };

  // Remove 'hiding' class after the closing animation completes
  const handleTransitionEnd = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.classList.remove(styles.hiding);
    }
  };

  return (
    <nav className={styles["main-navigation"]} aria-label="Main Navigation">
      <button
        type="button"
        className={`${styles["menu-toggle"]} menu-toggle`}
        aria-expanded={menuOpen}
        aria-controls="primary-menu"
        aria-label="Toggle navigation"
        onClick={handleToggle}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      
      <dialog
        ref={dialogRef}
        className={`${styles.drawer} ${styles['drawer-end']}`}
        id="primary-menu"
        onClose={handleDialogClose}
        onTransitionEnd={handleTransitionEnd}
      >
        <div className={styles["drawer-header"]}>
          <h5 className={styles["drawer-title"]} id="navbarDrawerLabel">Sections</h5>
          <button
            type="button"
            className={styles["close-btn"]}
            aria-label="Close"
            onClick={handleClose}
          ></button>
        </div>
        <div className={styles["drawer-body"]}>
          <ul className={`${styles.nav} ${styles['navbar-nav']}`}>
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
      </dialog>
    </nav>
  );
}