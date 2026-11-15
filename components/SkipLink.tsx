import styles from "./skipLink.module.scss";

export default function SkipLink() {
    return (
        <a
            href="#main-content"
            className={`${styles.skipLink} sr-only sr-only-focusable`}
        >
            Skip to main content
        </a>
    );
}