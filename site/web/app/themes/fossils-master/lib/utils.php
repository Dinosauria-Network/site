<?php

namespace Roots\Fossils\Utils;

/**
 * Tell WordPress to use searchform.php from the templates/ directory
 */
function get_search_form() {
  $form = '';
  locate_template('/templates/searchform.php', true, false);
  return $form;
}
add_filter('get_search_form', __NAMESPACE__ . '\\get_search_form');

if( !function_exists( 'odd_or_even' ) ) {
  global $current_class;
  $current_class = 'odd';
  
  function odd_or_even ( $classes ) {
    global $current_class;
    $classes[] = $current_class;
    
    $current_class = ($current_class == 'odd') ? 'even' : 'odd';
    
    return $classes;
  }
}
add_filter ( 'post_class' , __NAMESPACE__ . '\\odd_or_even' );

function first_post_class( $classes ) {
    global $wp_query;
    if( 0 == $wp_query->current_post )
        $classes[] = 'first';
        return $classes;
}
add_filter( 'post_class',  __NAMESPACE__ . '\\first_post_class' );