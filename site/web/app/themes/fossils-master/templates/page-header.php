<?php use Roots\Fossils\Titles; ?>

<div class="page-header">
  <?php if ( ! is_home() ) : ?><h1><?= Titles\title(); ?></h1><?php endif; ?>
  <?php if ( is_category() ) {

    $category = get_category( get_query_var('cat') );

    if ( ! empty( $category ) )
        echo '<div class="category-feed"><a class="btn btn-link" href="' . get_category_feed_link( $category->cat_ID ) . '" title="' . sprintf( __( 'Subscribe to this category', 'fossils' ), $category->name ) . '" rel="nofollow">' . __( 'Subscribe', 'fossils' ) . '<span class="glyphicon glyphicon-share-alt"><span></a></div>';
  } ?>
</div>
