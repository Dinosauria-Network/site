import { NewsPost } from "@/lib/genus-data";
import EntryMeta from "./EntryMeta";

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
      </div>
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
