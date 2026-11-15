import { getSiteMetadata } from "@/lib/genus-data";

export default function Footer() {
  const site = getSiteMetadata();
  const year = new Date().getFullYear();

  return (
    <>
      <div className="container" />
      <p className="site-info">
        Design by{" "}
        <a href="http://alexanderbell.info/" rel="designer">
          A. Bell
        </a>
        .
      </p>
      <p className="copyright">
        &copy; <time dateTime="2010-02-08">2010</time>-{year} {site.name}
      </p>
      <a id="going-up" title="back to top" href="#top">
        Top
      </a>
    </>
  );
}
