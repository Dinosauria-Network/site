import { NewsPost, getSourceFavicon, formatTimeAgo } from "@/lib/genus-data";
import styles from "./entryMeta.module.scss";

interface EntryMetaProps {
  post: NewsPost;
  href: string;
}

export default function EntryMeta({ post, href }: EntryMetaProps) {
    // Link the source to the paper itself, not the bare domain (doi.org has
    // no useful root page).
    const paperUrl = post.url && post.url.startsWith("http") ? post.url : "";

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
            {paperUrl ? (
                <a
                href={paperUrl}
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
            <span className={styles.extra}>Posted</span>{" "}
            <a rel="bookmark" href={href}>
                {formatTimeAgo(post.date)}
            </a>
            </time>
        </div>
    )
}