import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ArticleCard from "@/components/ArticleCard";
import MasonryGrid from "@/components/MasonryGrid";
import { getTopicStories, TOPICS } from "@/lib/topics";
import { pageTitle, SITE_NAME } from "@/lib/site";
import type { Metadata } from "next";

export const revalidate = 3600;

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ slug: topic.slug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>,
}): Promise<Metadata> {
  return params.then(({ slug }) => {
    const topic = TOPICS.find((t) => t.slug === slug);
    if (!topic) {
      return { title: pageTitle("Topic not found") };
    }
    return {
      title: pageTitle(topic.name),
      description: `${topic.description} - dinosaur and paleontology news from ${SITE_NAME}`,
    };
  });
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>,
}) {
  const { slug } = await params;
  const result = await getTopicStories(slug);
  if (!result) notFound();

  const { topic, posts } = result;

  return (
    <div className="genera-page">
      <PageHeader title={topic.name}>
        <p>{topic.description}</p>
      </PageHeader>

      <MasonryGrid>
        {posts.map((post, index) => (
          <ArticleCard key={post.id} post={post} index={index} />
        ))}
      </MasonryGrid>

      {posts.length === 0 && (
        <p>
          No published stories match this topic yet. Browse the{" "}
          <Link href="/news">full news archive</Link> or{" "}
          <Link href="/topics">all topics</Link>.
        </p>
      )}
    </div>
  );
}