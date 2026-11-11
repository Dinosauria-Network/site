import React from "react";
import { getSiteMetadata } from "@/lib/genus-data";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Script from "next/script";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import "@/app/styles/globals.scss";
import SkipLink from "@/components/SkipLink";
import PreviewBanner from "@/components/PreviewBanner";
import { Suspense } from "react";

const site = getSiteMetadata();

export const metadata = {
  title: site.name,
  description: "Dispensing your daily dose of dinosaurs",
  siteName: site.name,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="no-js" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Script
          id="js-detection"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.className = document.documentElement.className.replace('no-js', 'js');`,
          }}
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Vollkorn"
        />
        <link rel="stylesheet" href="/css/main.css" />
      </head>
      <body className="home blog">
        <ThemeProvider>
        <Suspense fallback={null}>
          <PreviewBanner />
        </Suspense>
        <SkipLink />
        <header className="banner" role="banner">
          <div className="container">
            <div id="top" className="brand">
              <a className="site-title" href="/">
                {site.name}
              </a>
              <div className="site-description">{site.description}</div>
            </div>
            <Navigation />
          </div>
        </header>

        <div className="wrap container" role="document">
          <div className="content row">{children}</div>
        </div>

        <footer className="site-footer" role="contentinfo">
          <Footer />
        </footer>
        </ThemeProvider>

        <Script
          src="/js/imagesloaded.pkgd.min.js"
          strategy="beforeInteractive"
        />
        <Script
          src="/js/masonry.pkgd.min.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
