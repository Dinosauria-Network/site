"use client";

import { useEffect, useRef } from "react";

export default function MasonryGrid({
  children,
}: {
  children: React.ReactNode;
}) {
  const gridRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let msnry: any = null;

    const init = () => {
      const Masonry = (window as any).Masonry;
      const imagesLoaded = (window as any).imagesLoaded;

      if (Masonry && gridRef.current) {
        msnry = new Masonry(gridRef.current, {
          itemSelector: ".hentry",
          columnWidth: 1,
          percentPosition: true,
          transitionDuration: 0,
        });

        if (imagesLoaded) {
          imagesLoaded(gridRef.current, () => {
            msnry?.layout();
          });
        }
      }
    };

    if ((window as any).Masonry) {
      init();
    } else {
      let attempts = 0;
      const maxAttempts = 60; // 3s cap
      const timer = setInterval(() => {
        attempts++;
        if ((window as any).Masonry) {
          clearInterval(timer);
          init();
        } else if (attempts >= maxAttempts) {
          clearInterval(timer);
        }
      }, 50);
      return () => clearInterval(timer);
    }

    return () => {
      msnry?.destroy();
    };
  }, []);

  return (
    <main id="main" ref={gridRef} className="main grid" role="main">
      {children}
    </main>
  );
}
