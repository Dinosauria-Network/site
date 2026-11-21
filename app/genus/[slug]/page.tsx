import { notFound } from "next/navigation";
import { getGenusBySlug, getAllGenera } from "@/lib/genus-data";
import type { FossilLocation } from "@/lib/genus-data";
import { pageTitle, SITE_NAME } from "@/lib/site";
import PageHeader from "@/components/PageHeader";
import GenusFossilMap from "@/components/GenusFossilMap";

export async function generateStaticParams() {
  const genera = getAllGenera();
  return genera.map((genus) => ({
    slug: genus.post_name,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const genus = getGenusBySlug(slug);
  if (!genus) {
    return { title: pageTitle("Genus Not Found") };
  }
  return {
    title: `${genus.post_title} - ${SITE_NAME}`,
    description: `${genus.post_title} - ${genus.author || "Unknown author"}, ${genus.taxonomy.map((t) => t.name).join(", ")}`,
  };
}

const MAX_REGION_ITEMS = 12;

/** Group map bubbles into "State, Country" lines for the readable list. */
function summarizeRegions(locations: FossilLocation[]) {
  const counts = new Map<string, number>();
  for (const loc of locations) {
    const region = [loc.state, loc.country].filter(Boolean).join(", ");
    if (!region) continue;
    counts.set(region, (counts.get(region) ?? 0) + (loc.count ?? 1));
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return {
    shown: ranked.slice(0, MAX_REGION_ITEMS),
    hiddenRegions: Math.max(0, ranked.length - MAX_REGION_ITEMS),
    totalOccurrences: locations.reduce((n, loc) => n + (loc.count ?? 1), 0),
  };
}

export default async function GenusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const genus = getGenusBySlug(slug);

  if (!genus) {
    notFound();
  }

  const fossilLocations = genus.meta?.fossilLocations ?? [];
  const regions = fossilLocations.length ? summarizeRegions(fossilLocations) : null;

  return (
    <div className="genus-page">
      <PageHeader title={genus.post_title}>
        <p className="genus-subtitle">
          {genus.author || "Unknown author"} &nbsp;|&nbsp;
          {genus.taxonomy.map((t) => t.name).join(", ")}
        </p>
      </PageHeader>

      <main className="genus-content">
        <article className="genus-article">
          <p>
            {genus.post_content ||
            genus.post_excerpt ||
            `No description available for ${genus.post_title}.`}
          </p>
        </article>

        <aside className="genus-meta">
          <dl>
            <dt>Period</dt>
            <dd>{genus.taxonomy.map((t) => t.name).join(", ")}</dd>
            <dt>Authority</dt>
            <dd>{genus.author || "Unknown"}</dd>
            <dt>Description Date</dt>
            <dd>{String(genus.post_date || "Unknown")}</dd>
          </dl>
        </aside>

        {fossilLocations.length > 0 && (
          <section className="genus-fossil-section" aria-labelledby="fossil-heading">
            <h2 id="fossil-heading">Where fossils have been found</h2>
            <p className="genus-fossil-note">
              Occurrence localities from the{" "}
              <a
                href={`https://paleobiodb.org/navigator/#taxa=${encodeURIComponent(genus.post_title)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Paleobiology Database
              </a>
              .
            </p>
            <GenusFossilMap locations={fossilLocations} genusName={genus.post_title} />
            {regions && (
              <>
                <p className="genus-fossil-summary">
                  {regions.totalOccurrences.toLocaleString("en-US")}{" "}
                  {regions.totalOccurrences === 1 ? "occurrence" : "occurrences"} in
                  the database, most reported from:
                </p>
                <ul className="genus-fossil-list">
                  {regions.shown.map(([region, count]) => (
                    <li key={region}>
                      {region}
                      {count > 1 ? ` (${count} occurrences)` : ""}
                    </li>
                  ))}
                  {regions.hiddenRegions > 0 && (
                    <li className="genus-fossil-more">
                      +{regions.hiddenRegions} more{" "}
                      {regions.hiddenRegions === 1 ? "region" : "regions"} on the map
                    </li>
                  )}
                </ul>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
