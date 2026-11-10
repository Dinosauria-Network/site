import Link from "next/link";
import { getEnrichedPostById, getSourceFavicon, formatTimeAgo, getAllPosts } from "@/lib/genus-data";
import { notFound } from "next/navigation";
import { getPublishedStoryByNumericId } from "@/lib/db/stories";

export const revalidate = 3600;

interface DetailPost {
  id: number | string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  author?: string;
  source: string;
  url?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

async function getDetailPost(id: number): Promise<DetailPost | null> {
  // DB first: pipeline stories (postIds issued from max+1) collide with
  // retired JSON ids — the DB story wins for its own id.
  const story = await getPublishedStoryByNumericId(id);
  if (story) {
    const body = (story.body ?? {}) as {
      image?: string | null;
      url?: string | null;
      source?: string | null;
      author?: string | null;
      sourcePostId?: number | null;
    };
    const date = story.publishedAt ?? story.createdAt;
    return {
      id: body.sourcePostId ?? id,
      title: story.headline,
      excerpt: story.description ?? story.deck ?? "",
      image: body.image ?? "",
      date: date ? date.toISOString().split("T")[0] : "",
      author: body.author ?? "Dinosauria Network",
      source: body.source ?? "Database",
      url: body.url ?? "",
      ogTitle: story.headline,
      ogDescription: story.description ?? story.deck ?? "",
      ogImage: body.image ?? undefined,
    };
  }

  const jsonPost = await getEnrichedPostById(id);
  return jsonPost as unknown as DetailPost | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getDetailPost(parseInt(id, 10));
  if (!post) return { title: "Dinosaur News - Dinosauria Network" };
  return {
    title: post.ogTitle || post.title || "Dinosauria Network",
    description: post.ogDescription || post.excerpt || "",
    openGraph: {
      title: post.ogTitle || post.title || "",
      description: post.ogDescription || post.excerpt || "",
      images: post.ogImage ? [{ url: post.ogImage }] : undefined,
    },
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    id: String(post.id),
  }));
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getDetailPost(parseInt(id, 10));

  if (!post) {
    notFound();
  }

  let sourceDomain = "";
  try {
    if (post.url && post.url.startsWith("http")) {
      sourceDomain = new URL(post.url).hostname;
    }
  } catch {
    sourceDomain = "";
  }

  return (
    <article className="hentry">
      <header className="entry-header">
        <h1 className="summary-title">{post.title}</h1>
        <div className="entry-meta">
          <div className="byline author vcard">
            {post.source && (
              <img
                src={getSourceFavicon(post.source)}
                alt={post.source}
                width={16}
                height={16}
              />
            )}{" "}
            {sourceDomain ? (
              <a
                href={`//${sourceDomain}`}
                rel="author"
                className="fn"
                target="_blank"
                title="opens new window"
              >
                {post.source || post.author}
              </a>
            ) : (
              <span className="fn">{post.source || post.author}</span>
            )}
            <span className="sep">&bull;</span>
          </div>
          <time className="updated" dateTime={post.date}>
            <span className="extra">Posted</span> {" "}
            <a rel="bookmark" href={`/news/${post.id}`}>
              {formatTimeAgo(post.date)}
            </a>
          </time>
        </div>
      </header>

      {post.image && (
        <div className="post-image alignleft">
          <picture className="responsive-image">
            <img className="wp-post-image" src={post.image} alt={post.title} />
          </picture>
        </div>
      )}

      {post.excerpt && (
        <div className="entry-summary" style={{ display: "block" }}>
          <p>{post.excerpt}</p>
        </div>
      )}

      <div className="posts-navigation">
        <div className="nav-previous">
          <Link href="/">&larr; Back to News</Link>
        </div>
      </div>

      <section className="comments" aria-label="Comments">
        <h2>Comments</h2>
        <p>Comments are not enabled for this post.</p>
      </section>
    </article>
  );
}
