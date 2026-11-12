import { NewsPost } from "@/lib/genus-data";
import EntryMeta from "./EntryMeta";

interface ArticleCardProps {
  post: NewsPost;
  index: number;
  /** When set (preview mode), detail links keep ?preview=<value> so drafts stay reachable. */
  preview?: string;
}

export default function ArticleCard({ post, index, preview }: ArticleCardProps) {
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

  const postHref = preview ? `/news/${post.id}?preview=${encodeURIComponent(preview)}` : `/news/${post.id}`;

  const rawImage = post.image || '';
  // No image on the story → render no image at all. Never substitute a
  // generic photo: a story must carry its own licensed image or none.
  const hasImage = Boolean(rawImage);
  const basename = hasImage
    ? rawImage.replace('/images/news/', '').replace(/\.(jpg|jpeg|png|gif|webp|avif)$/i, '')
    : '';
  const ext = hasImage ? (rawImage.match(/\.([^.\/]+)$/)?.[1] || 'jpg') : 'jpg';
  const imgSrc = hasImage ? `/images/news/${basename}.${ext}` : '';
  // CC BY/BY-SA images legally require attribution — it travels with the
  // image everywhere the card renders (homepage masonry, /news archive).
  const credit = (() => {
    const a = post.imageAttribution?.trim();
    const lic = post.imageLicense?.trim();
    if (!a && !lic) return null;
    const isUrl = a ? /^https?:\/\//i.test(a) : false;
    let label = a ?? '';
    if (a && isUrl) {
      try { label = new URL(a).hostname.replace(/^www\./, ''); } catch { /* keep full string */ }
    } else if (label.length > 80) {
      label = label.slice(0, 77) + '…';
    }
    return { a, lic, isUrl, label };
  })();

  return (
    <article className={articleClasses}>
      {hasImage && (
        <div className="post-image">
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
          {credit && (
            <div className="card-image-credit">
              Image:{" "}
              {credit.isUrl && credit.a ? (
                <a href={credit.a} target="_blank" rel="noopener">{credit.label}</a>
              ) : (
                credit.label
              )}
              {credit.a && credit.lic ? " · " : ""}
              {credit.lic}
            </div>
          )}
        </div>
      )}
      <header className="entry-header">
        <h2 className="summary-title">
          <a href={postHref}>{post.title}</a>
        </h2>
        <EntryMeta post={post} href={postHref} />
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
            &lt; 10 min
          </button>
          <a className="btn btn-sm btn-primary" href={postHref}>
            Read more
          </a>
        </div>
      </div>
    </article>
  );
}
