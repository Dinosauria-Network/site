<footer class="site-footer" role="contentinfo">
  <div class="container">
    <?php dynamic_sidebar('sidebar-footer'); ?>
  </div>
  <p class="site-info">
        <?php printf( __( 'Design by %1$s.', 'fossils' ), '<a href="http://alexanderbell.info/" rel="designer">A. Bell</a>' ); ?>
  </p><!-- .site-info -->
  <p class="copyright">
    	<?php the_modified_date( 'Y', '&copy; <time datetime="2010-02-08">2010</time>-' ); ?> <?php bloginfo('name'); ?>
  </p><!-- .copyright -->
  <a id="going-up" title="<?php _e( 'back to top', 'fossils' ) ?>" href="#top"><?php _e( 'Top', 'fossils' ) ?></a>
</footer>
