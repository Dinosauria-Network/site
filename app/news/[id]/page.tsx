import Link from "next/link";
import { getEnrichedPostById, getSourceFavicon, formatTimeAgo, getAllPosts } from "@/lib/genus-data";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getEnrichedPostById(parseInt(id, 10));
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
  const post = await getEnrichedPostById(parseInt(id, 10));

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
