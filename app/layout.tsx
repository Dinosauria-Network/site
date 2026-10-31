import { getSiteMetadata } from "@/lib/genus-data";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import Script from "next/script";

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
    <html lang="en" className="js">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Vollkorn"
        />
        <link rel="stylesheet" href="/css/main.css" />
      </head>
      <body className="home blog">
        <a href="#main-content" className="skip-link sr-only sr-only-focusable">
          Skip to main content
        </a>
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
