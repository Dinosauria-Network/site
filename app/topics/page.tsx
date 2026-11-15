import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { getTopicCounts } from "@/lib/topics";
import { pageTitle, SITE_NAME } from "@/lib/site";

export const metadata = {
  title: pageTitle("Topics"),
  description: `Browse dinosaur news by topic - ${SITE_NAME}`,
};

export const revalidate = 3600;

export default async function TopicsPage() {
  const topics = await getTopicCounts();
  const totalStories = topics.reduce((max, t) => Math.max(max, t.count), 0);

  return (
    <div className="genera-page">
      <PageHeader title="Topics">
        <p>
          Browse the news archive by subject — every story is collected under
          the dinosaurs, fossils and themes it covers.
        </p>
      </PageHeader>

      <section className="genera-grid">
        {topics.map(({ topic, count }) => (
          <article key={topic.slug} className="genus-card">
            <h3>
              <Link href={`/topics/${topic.slug}`}>{topic.name}</Link>
            </h3>
            <p className="genus-period">{topic.description}</p>
            <p className="genus-author">
              {count} {count === 1 ? "story" : "stories"}
            </p>
          </article>
        ))}
      </section>

      {totalStories === 0 && (
        <p>No published stories yet — check back after the next news sweep.</p>
      )}
    </div>
  );
}
