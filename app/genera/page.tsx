import { getGeneraByPeriod, getAllGenera, getUniquePeriods } from "@/lib/genus-data";
import Link from "next/link";

export const metadata = {
  title: "Dinosaur Genera Database",
  description:
    "Browse the complete database of dinosaur genera - Dinosauria Network",
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
      <header className="page-header">
        <h1>Dinosaur Genera Database</h1>
        <p>
          Browse {genera.length} dinosaur genus
          {genera.length === 1 ? "" : "es"} organized by geological period.
        </p>
      </header>

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
              {genus.taxonomy.map((t) => t.name).join(", ")}
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
