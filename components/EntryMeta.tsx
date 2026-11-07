import { NewsPost, getSourceFavicon, formatTimeAgo } from "@/lib/genus-data";
import styles from "./entryMeta.module.scss";

interface EntryMetaProps {
  post: NewsPost;
  href: string;
}

export default function EntryMeta({ post, href }: EntryMetaProps) {
    // Extract source domain safely
    let sourceDomain = "";
    try {
        if (post.url && post.url.startsWith("http")) {
            sourceDomain = new URL(post.url).hostname;
        }
    } catch {
        sourceDomain = "";
    }

    return (
        <div className={styles['entry-meta']}>
            <div className={`${styles.byline} author vcard`}>
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
                className={styles.fn}
                target="_blank"
                title="opens new window"
                >
                {post.source || post.author}
                </a>
            ) : (
                <span className={styles.fn}>{post.source || post.author}</span>
            )}
            <span className={styles.sep}>&bull;</span>
            </div>
            <time className={styles.updated} dateTime={post.date}>
            <span className="extra">Posted</span>{" "}
            <a rel="bookmark" href={href}>
                {formatTimeAgo(post.date)}
            </a>
            </time>
        </div>
    )
}