import { NewsPost, getSourceFavicon, formatTimeAgo } from "@/lib/genus-data";

interface ArticleCardProps {
  post: NewsPost;
  index: number;
}

export default function ArticleCard({ post, index }: ArticleCardProps) {
  const isFirst = index === 0;
  const isFirstEven = index % 2 === 0; // 0-based: first card is even // 0-based: 0 is odd (1st), 1 is even (2nd)

  const articleClasses = [
    `post-${post.id}`,
    "post",
    "type-post",
    "hentry",
    isFirst ? "first" : "",
    isFirstEven ? "even" : "odd",
  ]
    .filter(Boolean)
    .join(" ");

  // Extract source domain safely
  let sourceDomain = "";
  try {
    if (post.url && post.url.startsWith("http")) {
      sourceDomain = new URL(post.url).hostname;
    }
  } catch {
    sourceDomain = "";
  }

  const postHref = `/news/${post.id}`;

  const rawImage = post.image || '';
  const hasImage = rawImage && rawImage !== '';
  const basename = hasImage
    ? rawImage.replace('/images/news/', '').replace(/\.(jpg|jpeg|png|gif|webp|avif)$/i, '')
    : 'archaeopteryx-plumage'; // fallback — no mapping rules
  const ext = hasImage ? (rawImage.match(/\.([^.\/]+)$/)?.[1] || 'jpg') : 'jpg';
  const imgSrc = hasImage ? `/images/news/${basename}.${ext}` : `/images/news/${basename}-1024.jpg`;

  return (
    <article className={articleClasses}>
      <a className="responsive-image" href={postHref} title={post.title}>
        <picture>
          <source srcSet={`/images/news/${basename}-1024.jpg`} media="(min-width: 1024px)" />
          <source srcSet={`/images/news/${basename}-640.jpg`} media="(min-width: 640px)" />
          <source srcSet={`/images/news/${basename}-480.jpg`} media="(min-width: 480px)" />
          <img
            className="wp-post-image"
            src={imgSrc}
            alt={post.title}
            loading="lazy"
            width={1024}
            height={633}
          />
        </picture>
      </a>
      
      <header className="entry-header">
        <h2 className="summary-title">
          <a href={postHref}>{post.title}</a>
        </h2>
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
            <span className="extra">Posted</span>{" "}
            <a rel="bookmark" href={postHref}>
              {formatTimeAgo(post.date)}
            </a>
          </time>
        </div>
      </header>
      <div className="entry-summary">
        <p>{post.excerpt}</p>
        <div className="btn-group" role="group">
          <button
            className="btn btn-primary btn-sm disabled"
            disabled
            aria-label="Estimated reading time"
          >
            <span
              className="glyphicon glyphicon-time"
              aria-hidden="true"
            ></span>
            <span className="sr-only">Estimated reading time: </span>
            &lt; 1 min
          </button>
          <a className="btn btn-sm btn-primary" href={postHref}>
            Read more
          </a>
        </div>
      </div>
    </article>
  );
}
