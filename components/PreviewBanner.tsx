'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Site-wide preview banner rendered at the very top of the page (root layout).
 * Development-only: production previews require the PREVIEW_TOKEN env var,
 * which must not leak to the client — so prod shows nothing.
 */
export default function PreviewBanner() {
  const sp = useSearchParams();
  if (process.env.NODE_ENV !== 'development') return null;
  const v = sp.get('preview');
  if (v === null || v === '0' || v === 'false') return null;
  return (
    <div
      role="status"
      style={{
        padding: '0.4rem 1rem',
        fontSize: '0.8rem',
        textAlign: 'center',
        background: '#3a2e12',
        color: '#f0d48a',
        borderBottom: '1px solid #6b531f',
      }}
    >
      Preview mode — unpublished stories are visible on this page.
    </div>
  );
}
