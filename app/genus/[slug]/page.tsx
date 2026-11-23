import { notFound } from "next/navigation";
import { getGenusBySlug, getAllGenera, getGenusPeriodLabel } from "@/lib/genus-data";
import type { FossilLocation } from "@/lib/genus-data";
import { pageTitle, SITE_NAME } from "@/lib/site";
import PageHeader from "@/components/PageHeader";
import GenusFossilSection from "@/components/GenusFossilSection";

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
    description: `${genus.post_title} - ${genus.author || "Unknown author"}, ${getGenusPeriodLabel(genus) ?? genus.taxonomy.map((t) => t.name).join(", ")}`,
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

  // Derive which Mesozoic periods this genus is actually found in.
  // Primary: the `period` field on each bubble. Fallback: infer from maxMa.
  const activePeriods = fossilLocations.length
    ? Array.from(
        new Set(
          fossilLocations.map((loc) => {
            if (loc.period) return loc.period;
            const ma = loc.maxMa ?? loc.minMa;
            if (ma == null) return null;
            if (ma >= 201.4) return "Triassic";
            if (ma >= 143.1) return "Jurassic";
            return "Cretaceous";
          }).filter((p): p is string => p !== null)
        )
      )
    : undefined;

  return (
    <div className="genus-page">
      <PageHeader title={genus.post_title}>
        <p className="genus-subtitle">
          {genus.author || "Unknown author"} &nbsp;|&nbsp;
          {getGenusPeriodLabel(genus) ?? genus.taxonomy.map((t) => t.name).join(", ")}
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
            <dd>{getGenusPeriodLabel(genus) ?? genus.taxonomy.map((t) => t.name).join(", ")}</dd>
            <dt>Authority</dt>
            <dd>{genus.author || "Unknown"}</dd>
            <dt>Description Date</dt>
            <dd>{String(genus.post_date || "Unknown")}</dd>
          </dl>
        </aside>

        {fossilLocations.length > 0 && (
          <GenusFossilSection
            locations={fossilLocations}
            genusName={genus.post_title}
            activePeriods={activePeriods}
            regions={regions}
          />
        )}
      </main>
    </div>
  );
}
