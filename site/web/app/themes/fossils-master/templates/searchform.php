<form role="search" method="get" class="search-form form-inline" action="<?php esc_url(home_url('/')); ?>">
  <label class="sr-only"><?php _e('Search for:', 'fossils'); ?></label>
  <div class="input-group">
    <input type="search" value="<?php get_search_query(); ?>" name="s" class="search-field form-control" placeholder="<?php _e('Search', 'fossils'); ?> <?php bloginfo('name'); ?>" required>
    <span class="input-group-btn">
      <button type="submit" class="search-submit btn btn-default"><?php _e('Search', 'fossils'); ?></button>
    </span>
  </div>
</form>
