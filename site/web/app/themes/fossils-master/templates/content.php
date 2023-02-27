<?php use function Roots\Fossils\Assets\responsive_image; ?>
<article <?php post_class(); ?>>
  <?php if ( has_post_thumbnail() ) : ?>
	<div class="post-image alignleft">
        	<a href="<?php the_permalink(); ?>" title="<?php the_title_attribute(); ?>"<?php if
(is_syndicated()) { echo ' target="_blank"'; } ?>>
			<?php $url = wp_get_attachment_url( get_post_thumbnail_id($post->ID) );
  			echo do_shortcode( '[rimg src="' . $url . '"]' ); ?>
		</a>
	</div>
  <?php endif; ?>
  <header class="entry-header">
    <h2 class="summary-title"><a href="<?php the_permalink(); ?>"<?php if ( is_syndicated() ) { echo ' target="_blank"'; } ?>><?php the_title(); ?></a></h2>
    <?php get_template_part('templates/entry-meta'); ?>
  </header>
  <div class="entry-summary">
    <?php the_excerpt(); ?>
  </div>
</article>