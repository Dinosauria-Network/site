import Script from 'next/script';
import { GA_MEASUREMENT_ID } from '@/lib/site';

/**
 * GA4 — injects the gtag.js snippet only when NEXT_PUBLIC_GA_MEASUREMENT_ID
 * is set. Omitted entirely in dev/build without the env var (no runtime
 * error, no console warning). strategy="afterInteractive" loads the GA
 * script after hydration so it never blocks the critical path.
 *
 * Page-view tracking is automatic via gtag('config', ID) on load. For SPA
 * route-change events, extend this component with a usePathname() effect
 * calling gtag('config', ID, { page_path: pathname }).
 */
export default function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
