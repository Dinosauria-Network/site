<?php

namespace Roots\Fossils\Assets;

/**
 * Scripts and stylesheets
 *
 * Enqueue stylesheets in the following order:
 * 1. /theme/dist/styles/main.css
 *
 * Enqueue scripts in the following order:
 * 1. /theme/dist/scripts/modernizr.js
 * 2. /theme/dist/scripts/main.js
 */

class JsonManifest {
  private $manifest;

  public function __construct($manifest_path) {
    if (file_exists($manifest_path)) {
      $this->manifest = json_decode(file_get_contents($manifest_path), true);
    } else {
      $this->manifest = [];
    }
  }

  public function get() {
    return $this->manifest;
  }

  public function getPath($key = '', $default = null) {
    $collection = $this->manifest;
    if (is_null($key)) {
      return $collection;
    }
    if (isset($collection[$key])) {
      return $collection[$key];
    }
    foreach (explode('.', $key) as $segment) {
      if (!isset($collection[$segment])) {
        return $default;
      } else {
        $collection = $collection[$segment];
      }
    }
    return $collection;
  }
}

function asset_path($filename) {
  $dist_path = get_template_directory_uri() . DIST_DIR;
  $directory = dirname($filename) . '/';
  $file = basename($filename);
  static $manifest;

  if (empty($manifest)) {
    $manifest_path = get_template_directory() . DIST_DIR . 'assets.json';
    $manifest = new JsonManifest($manifest_path);
  }

  if (array_key_exists($file, $manifest->get())) {
    return $dist_path . $directory . $manifest->get()[$file];
  } else {
    return $dist_path . $directory . $file;
  }
}

function assets() {
  wp_enqueue_style('fossils/css', asset_path('styles/main.css'), false, null);

  if (is_single() && comments_open() && get_option('thread_comments')) {
    wp_enqueue_script('comment-reply');
  }
  
  wp_enqueue_style( 'googleFonts', 'https://fonts.googleapis.com/css?family=Vollkorn', false, null);

  wp_enqueue_script('modernizr', asset_path('scripts/modernizr.js'), [], null, true);
  wp_enqueue_script('fossils/js', asset_path('scripts/main.js'), ['jquery'], null, true);
  wp_enqueue_script('masonry', asset_path('scripts/masonry.js'), ['jquery'], null, true);
}
add_action('wp_enqueue_scripts', __NAMESPACE__ . '\\assets', 100);

/*
 * Get image ID from URL
 *
 * @since Fossils 1.5
 */
function get_attachment_id_from_src($url) {
	global $wpdb;
	$prefix = $wpdb->prefix;
	$attachment = $wpdb->get_col($wpdb->prepare("SELECT ID FROM " . $prefix . "posts" . " WHERE guid='%s';", $url ));
	return $attachment[0];
}
/*
 * Responsive shortcode
 *
 * @since Fossils 1.5
 */
function responsive_image($atts){
  $post_id = get_queried_object_id();
  extract( shortcode_atts( array(
    'src' => '',
    'caption' => '',
  ), $atts ) );
  if($src != '') {
    $img_ID = get_post_thumbnail_id( $post_id );
    $large  = wp_get_attachment_image_src( $img_ID, 'large' );
    $medium = wp_get_attachment_image_src( $img_ID, 'medium' );
    $small  = wp_get_attachment_image_src( $img_ID, 'small' );
    $thumb  = wp_get_attachment_image_src( $img_ID, 'thumbnail' );
    $alt    = get_post_meta($img_ID, '_wp_attachment_image_alt', true);
 
    $output = <<<HTML
      <picture class="responsive-image">
        <!--[if IE 9]><video style="display: none;"><![endif]-->
        <source srcset="$src" media="(min-width: 1280px)">
        <source srcset="$large[0]" media="(min-width: 960px)">
        <source srcset="$medium[0]" media="(min-width: 640px)">
        <source srcset="$small[0]" media="(min-width: 480px)">
        <!--[if IE 9]></video><![endif]-->
        <img class="wp-post-image" srcset="$thumb[0]" alt="$alt">
      </picture>
    HTML;
    if($caption != '') $output.= '  <p class="caption">' . $caption . '</p>';
  }
  return $output;
}
add_shortcode('rimg', __NAMESPACE__ . '\\responsive_image');