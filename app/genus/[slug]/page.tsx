import { notFound } from "next/navigation";
import { getGenusBySlug, getAllGenera } from "@/lib/genus-data";

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
    return { title: "Genus Not Found - Dinosauria Network" };
  }
  return {
    title: `${genus.post_title} - Dinosauria Network`,
    description: `${genus.post_title} - ${genus.author || "Unknown author"}, ${genus.taxonomy.map((t) => t.name).join(", ")}`,
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

  return (
    <div className="genus-page">
      <header className="page-header">
        <h1>{genus.post_title}</h1>
        <p className="genus-subtitle">
          {genus.author || "Unknown author"} &nbsp;|&nbsp;
          {genus.taxonomy.map((t) => t.name).join(", ")}
        </p>
      </header>

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
      </main>
    </div>
  );
}