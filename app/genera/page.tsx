import { getAllGenera, getGenusPeriodLabel, getGeneraByPeriod, getUniquePeriods } from "@/lib/genus-data";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "Dinosaur Genera Database",
  description:
    `Browse the complete database of dinosaur genera - ${SITE_NAME}`,
};

export default async function GeneraPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const genera = sp.period ? getGeneraByPeriod(sp.period) : getAllGenera();

  return (
    <div className="genera-page">
      <PageHeader title="Dinosaur Genera Database">
        <p>
          Browse {genera.length} dinosaur genus
          {genera.length === 1 ? "" : "es"} organized by geological period.
        </p>
      </PageHeader>

      <section className="period-filters">
        <h2>Filter by Period</h2>
        <div className="period-list">
          {getUniquePeriods().map((period) => (
            <a
              key={period.slug}
              href={`/genera?period=${period.slug}`}
              className={"period-link" + (period.slug === sp.period ? " active" : "")}
            >
              {period.name}
            </a>
          ))}
        </div>
      </section>

      <section className="genera-grid">
        {genera.map((genus) => (
          <article key={genus.id} className="genus-card">
            <h3>
              <Link href={`/genus/${genus.post_name}`}>{genus.post_title}</Link>
            </h3>
            <p className="genus-period">
              {getGenusPeriodLabel(genus) ?? genus.taxonomy.map((t) => t.name).join(", ")}
            </p>
            <p className="genus-author">
              {genus.author || "Unknown author"}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
