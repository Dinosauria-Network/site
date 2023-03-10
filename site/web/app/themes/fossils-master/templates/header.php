<header class="banner" role="banner">
  <div class="container">
    <div id="top" class="brand">
      <a class="site-title" href="<?= esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a>
      <div class="site-description"><?php bloginfo('description'); ?></div>
    </div>
    <nav role="navigation">
      <?php
      if (has_nav_menu('primary_navigation')) :
        wp_nav_menu(['theme_location' => 'primary_navigation', 'menu_class' => 'nav']);
      endif;
      ?>
    </nav>
  </div>
</header>
