<?php

namespace Roots\Fossils\Extras;

use Roots\Fossils\Config;

/**
 * Add <body> classes
 */
function body_class($classes) {
  // Add page slug if it doesn't exist
  if (is_single() || is_page() && !is_front_page()) {
    if (!in_array(basename(get_permalink()), $classes)) {
      $classes[] = basename(get_permalink());
    }
  }

  // Add class if sidebar is active
  if (Config\display_sidebar()) {
    $classes[] = 'sidebar-primary';
  }

  return $classes;
}
add_filter('body_class', __NAMESPACE__ . '\\body_class');

/**
 * Clean up the_excerpt()
 */
function excerpt_more() {
	$mypost = get_post();
	$mycontent = $mypost->post_content; // wordpress users only
	$word = str_word_count(strip_tags($mycontent));
	$readingRate = 200;
	$m = ($word / $readingRate);
	if ( $m >= 0.75 ) {
		$est = round($m) . __(' min', 'fossils');
	} else {
		$est = __( '&lt; 1 min', 'fossils' );
	}
  return '<div class="btn-group" role="group"><a class="btn btn-primary btn-sm disabled" href="#!" aria-label="' . __('Estimated reading time', 'fossils') . '"><span class="glyphicon glyphicon-time" aria-hidden="true"></span><span class="sr-only">' . __('Estimated reading time: ', 'fossils') . '</span> ' . $est . '</a><a class="btn btn-sm btn-primary" href="' . get_permalink() . '">' . __('Read more', 'fossils') . '</a></div>';
}
add_filter('excerpt_more', __NAMESPACE__ . '\\excerpt_more');

function get_the_excerpt( $output ) {
  if ( has_excerpt() && ! is_attachment() ) {
    $output .= excerpt_more();
  }
  return $output;
}
add_filter( 'get_the_excerpt', __NAMESPACE__ . '\\get_the_excerpt' );


$the_url = esc_url( get_link_url() );

	function get_link_url() {
		$has_url = get_url_in_content( get_the_content() );
		if ( has_post_format( 'link' ) ) {
			return $has_url ? $has_url : apply_filters( 'the_permalink', get_permalink() );
		}
	}