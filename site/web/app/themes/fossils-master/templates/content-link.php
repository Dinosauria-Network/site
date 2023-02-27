<?php use function Roots\Fossils\Extras\get_link_url;
      use function Roots\Fossils\Assets\responsive_image;
$the_url = esc_url( get_link_url() ); ?>
<article <?php post_class(); ?>>
  <?php if ( has_post_thumbnail() ) : ?>
        	<a href="<?php the_permalink(); ?>" title="<?php the_title_attribute(); ?>"<?php if
(is_syndicated()) { echo ' target="_blank"'; } ?>>
			<?php
			$url = wp_get_attachment_url( get_post_thumbnail_id($post->ID) );
  			echo do_shortcode( '[rimg src="' . $url . '"]' );
			?>
		</a>
  <?php endif; ?>
  <header class="entry-header">
    <?php if ( is_single() ) : ?>
		<h1 class="entry-title"><a href="<?php if (!empty($the_url)) { echo $the_url; } ?>"><?php the_title(); ?></a></h1>
	<?php else : ?>
		<h2 class="summary-title"><a target="_blank" href="<?php if (!empty($the_url)) { echo $the_url; } else { the_permalink(); } ?>"><?php the_title(); ?></a></h2>
	<?php endif; ?>
    <?php get_template_part('templates/entry-meta'); ?>
  </header>
  <div class="entry-summary">
    <?php the_excerpt(); ?>
  </div>
</article>