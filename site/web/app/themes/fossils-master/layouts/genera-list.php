<?php
/**
 * Template Name: Genera List Template
 *
 * Description: Fossils has a special post-type called Genera. This template displays them nicely.
 *
 * @package WordPress
 * @subpackage Fossils
 * @since Fossils 1.2
 */

get_template_part('templates/page', 'header'); ?>

<style type="text/css">
	.main #top {
		height: calc(100vh - 12px - 115px);
		width: calc(82vw - 25px);
		display: table;
		background: #120f0d url("../img/freeflyer.jpg") no-repeat scroll center bottom;
		background-size: cover;
		position: relative;
		border: 6px inset #e7e6e3;
		border-top-color: #c9c8c5;
		border-right-color: #f2f1ed;
		border-bottom-color: #f5f4f0;
		border-left-color: #cccbc8;
		text-align: center;
		overflow: hidden;
	}

	.texture {
		display: block;
		height: 100%;
		width: 100%;
		position: absolute;
		overflow: hidden;
		top: 0px;
		left: 0px;
		background-image: url("../img/diagonal-pattern.png");
	}

	#top h2 {
		font-size: 176px;
		font-size: 11rem;
		font-weight: normal;
		text-shadow: none;
		text-decoration: none;
	}

	#listing {
		padding: 22% 15%;
		line-height: 1;
	}

	#listing h3 {
		font-weight: 300;
		color: #120f0d;
		font-size: 34px;
		font-size: 2.125rem;
		font-style: italic;
		padding-bottom: 12px;
		margin: 0;
	}

	#listing a {
		text-decoration: none;
	}

	#listing ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	#listing li {
		border-top: 2px groove #e7e6e3;
		padding: 44px 0px;
	}

	#listing li:first-child {
		border-top: medium none;
		padding-top: 0px;
	}

	.species-name,
	.species-date {
		float: left;
		width: 100%;
		text-align: left;
	}

	.species-name {
		padding-bottom: 20px;
	}

	.era {
		position: relative;
		width: 21px;
		height: 21px;
		background-size: 21px 63px;
		float: left;
		margin-right: 20px;
		box-shadow: 1px 1px 3px 1px #b8b6ad;
	}

	.cretaceous {
		background: url("./img/eras.jpg") no-repeat 0px 0px;
		background: linear-gradient(#7eff00, #7eff00 42.473118%, #7f7f7f 43%);
	}

	.jurassic {
		background: url("./img/eras.jpg") no-repeat -21px 0px;
		background: linear-gradient(#7f7f7f, #7f7f7f 42%, #0ff 43%, #0ff 72.795699%, #7f7f7f 72.795699%);
	}

	.triassic {
		background: url("./img/eras.jpg") no-repeat -42px 0px;
		background: linear-gradient(#7f7f7f, #7f7f7f 72.795699%, #7f00ff 72.795699%);
	}

	.cretaceous::after {
		content: '';
		position: absolute;
		left: 50%;
		width: 50%;
		height: 42.5%;
	}

	.late.cretaceous::after {
		background: rgb(166,212,104);
		background: linear-gradient(180deg, rgb(166, 212, 104) 0%, rgb(166, 212, 104) 43%, rgba(128,128,128,0.67) 44%, rgba(128, 128, 128, 0.67) 100%);
	}

	.early.cretaceous::after {
		background: rgb(126,205,116);
		background: linear-gradient(180deg, rgba(128, 128, 128, 0.67) 0%, rgba(128, 128, 128, 0.67) 43%, rgb(126,205,116) 44%, rgb(126, 205, 116) 100%);
	}

	.jurassic::after {
		content: '';
		position: absolute;
		width: 50%;
		height: 30.28571%;
		left: 50%;
		top: 42.5%;
	}

	.late.jurassic::after {
		background: rgb(151, 227, 250);
		background: linear-gradient(180deg, rgb(151, 227, 250) 0%, rgb(151, 227, 250) 32%, rgba(128,128,128,0.67) 33%, rgba(128, 128, 128, 0.67) 100%);
	}

	.middle.jurassic::after {
		background: rgb(52, 209, 235);
		background: linear-gradient(180deg, rgba(128, 128, 128, 0.67) 0%, rgba(128, 128, 128, 0.67) 32%, rgb(52, 209, 235) 33%, rgb(52, 209, 235) 50%, rgba(128, 128, 128, 0.67) 51%, rgba(128, 128, 128, 0.67) 100%);
	}

	.early.jurassic::after {
		background: rgb(0, 183, 234);
		background: linear-gradient(180deg, rgba(128, 128, 128, 0.67) 0%, rgba(128, 128, 128, 0.67) 51%, rgb(0, 183, 234) 52%, rgb(0, 183, 234) 100%);
	}

	.triassic::after {
		content: '';
		height: 27.2168%;
		width: 50%;
		position: absolute;
		left: 50%;
		top: 72.7832%;
	}

	.late.triassic::after {
		background: rgb(198, 152, 194);
		background: linear-gradient(180deg, rgb(198, 152, 194) 0%, rgb(198, 152, 194) 70.275%, rgba(128,128,128,0.67) 70.825%, rgba(128, 128, 128, 0.67) 100%);
	}

	.middle.triassic::after {
		background: rgb(191, 124, 177);
		background: linear-gradient(180deg, rgba(128, 128, 128, 0.67) 0%, rgba(128, 128, 128, 0.67) 70.825%, rgb(191, 124, 177) 70.825%, rgb(191, 124, 177) 99.90708%, rgba(128, 128, 128, 0.67) 99.90708%, rgba(128, 128, 128, 0.67) 100%);
	}

	.early.triassic::after {
		background: rgb(173, 87, 154);
		background: linear-gradient(180deg, rgba(128, 128, 128, 0.67) 0%, rgba(128, 128, 128, 0.67) 99.90708%, rgb(173, 87, 154) 52%, rgb(173, 87, 154) 100%);
	}

	.species-name p {
		font-family: Georgia, serif;
		font-size: 16px;
		font-size: 1rem;
		color: #7f7c74;
		font-weight: bold;
		padding: 0;
		margin: 0;
	}

	.species-date h4 {
		font-weight: 300;
		color: #120f0d;
		font-size: 22px;
		font-size: 1.375rem;
		display: inline;
		padding-right: 6px;
		padding-bottom: 6px;
		margin: 0;
	}

	.species-date h5 {
		font-family: Georgia, serif;
		font-size: 14px;
		font-size: 0.875rem;
		display: inline;
		color: #7f7c74;
		font-variant: small-caps;
		font-style: italic;
		padding-top: 3px;
	}

	.one-col p:first-child {
		display: none;
	}

	.clearfix:before,
	.clearfix:after {
		content: " ";
		display: table;
	}

	.clearfix:after {
		clear: both;
	}

	@media screen and (min-width: 800px) {
		.species-name {
			width: 70%;
		}
		.species-date {
			width: 30%;
			text-align: right;
		}
		.species-date h4 {
			display: block;
			font-size: 40px;
			font-size: 2.5rem;
		}
		.species-date h5 {
			display: block;
			margin-top: 4px;
		}
	}
</style>

<section id="primary" class="content-area one-col">
	<div id="content" class="site-content" role="main">
		<div id="top">
			<a id="container" href="#listing">
				<span class="texture"></span>
				<h2><span class="sr-only">Currently there are over </span><?php echo wp_count_posts('genus')->publish; ?><span class="sr-only"> different species of dinosaurs that have been identified and named.</span></h2>
			</a>
		</div>
<?php // The Query
$the_query = new WP_Query( array(
	'meta_query' => array(
        'date_new' => array(
            'key' => 'genus_authority__date',
			'type' => 'DATE',
			'compare' => 'EXISTS',
        ),
    ),
	'post_type' => 'genus',
	'posts_per_page' => 1000,
	'orderby' => array(
        'date_new' => 'DESC',
    ),
) );

// The Loop
if ( $the_query->have_posts() ) {
	echo '<div id="listing"><ul>';
	while ( $the_query->have_posts() ) {
		$the_query->the_post();
		
		$name = get_the_title();
		$title = the_title_attribute( 'echo=0' );
		
		$strata_list = get_the_terms( $post->ID, 'geological_time' );
		$strata_list_reversed = $strata_list && !in_array('triassic', $strata_list) ? array_reverse( $strata_list ) : $strata_list;
		$strata_names = $strata_list_reversed ? join( ' ', wp_list_pluck( $strata_list_reversed, 'name') ) : ucwords( get_post_meta( $post->ID, 'period', true ) );
		$era_classes = $strata_list_reversed ? join( ' ', wp_list_pluck( $strata_list_reversed, 'slug') ) : get_post_meta( $post->ID, 'period', true );

		$date_old =  DateTime::createFromFormat( 'Ymd', get_post_meta( $post->ID, 'description-date', true) );
		$date_new = DateTime::createFromFormat( 'Y-m-d', get_post_meta( $post->ID, 'genus_authority__date', true) );
		$date = $date_new ? $date_new : $date_old;
		$datestamp = $date instanceof DateTime ? $date->format('Y-m-d') : '';
		$year = $date instanceof DateTime ? $date->format('Y') : 'YYYY';

		$author = get_post_meta($post->ID, 'genus_authority__author', true) ? get_post_meta($post->ID, 'genus_authority__author', true) : get_post_meta($post->ID, 'author', true);

		$list_item = <<<HTML
		<li class="clearfix">
			<div class="species-name">
				<h3><a href="" title="$title" rel="bookmark">$name</a></h3>
				<div class="era $era_classes"></div>
				<p>$strata_names</p>
			</div>
			<div class="species-date">
				<h4>
					<time datetime="$datestamp">$year</time>
				</h4>
				<h5>by $author</h5>
			</div>
		</li>
		HTML;
		echo $list_item;
	}
	echo '</ul></div>';
} else {
	// no posts found
}
/* Restore original Post Data */
wp_reset_postdata(); ?>
			</ul>
		</div>        
	</div>
</section>