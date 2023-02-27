<?php use function Roots\Fossils\Extras\external_title;

$syndication_src = get_syndication_source_link();
$syndication_author = parse_url( $syndication_src, PHP_URL_HOST);
set_transient('syndication_author', $syndication_author, 132007);

if ( is_sticky() && is_home() && ! is_paged() ) {
	printf( '<span class="sticky-post">%s</span>', __( 'Featured', 'fossils' ) );
} ?>
<div class="entry-meta">
    <div class="byline author vcard">
      <?php if ( is_syndicated() ) : ?>
	<img src="<?php echo 'https://www.google.com/s2/favicons?domain=' . get_transient('syndication_author'); ?>" alt="<?php echo the_syndication_source(); ?>"> 
	<a href="<?= '//' . get_transient('syndication_author'); ?>" rel="author" class="fn" target="_blank" title="<?php _e('opens new window', 'fossils'); ?>">
            <?php if ( ! empty( get_syndication_source() ) ) { echo get_syndication_source(); } else { echo get_transient('syndication_author'); } ?>
        </a>
      <?php else : ?>
	<?php _e('By', 'fossils'); ?> <a href="<?php get_author_posts_url(get_the_author_meta('ID')); ?>" rel="author" class="fn"><?php echo get_the_author(); ?></a>
      <?php endif; ?>
	<span class="sep">&bull;</span>
    </div>
    <time class="updated" datetime="<?php echo get_post_time('c', true); ?>"><span class="extra"><?php _e('Posted', 'fossils'); ?></span> <a rel="bookmark" href="<?php echo get_the_permalink(); ?>"><?php printf( _x( '%s ago', '%s = human-readable time difference', 'fossils' ), human_time_diff( get_the_time( 'U' ), current_time( 'timestamp' ) ) ); ?></a></time>
</div>