<?php
/**
 * Conditional loading of editor and frontend assets.
 *
 * @package BHB\BlockHeaderBehavior
 */

namespace BHB\BlockHeaderBehavior;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers and enqueues scripts and styles when needed.
 *
 * @since 1.0.0
 */
final class Assets {

	/**
	 * Cached result of frontend asset requirement detection.
	 *
	 * @var bool|null
	 */
	private static $frontend_needed = null;

	/**
	 * Registers WordPress hooks.
	 *
	 * @return void
	 */
	public function register_hooks() {
		add_action( 'init', array( $this, 'register_frontend_assets' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'maybe_enqueue_frontend' ), 20 );

		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor' ) );
	}

	/**
	 * Registers frontend script and style handles (not enqueued globally).
	 *
	 * @return void
	 */
	public function register_frontend_assets() {
		$version = BHB_VERSION;

		wp_register_style(
			'bhb-block-header-behavior',
			BHB_PLUGIN_URL . 'assets/css/style.css',
			array(),
			$version
		);

		wp_register_script(
			'bhb-block-header-behavior',
			BHB_PLUGIN_URL . 'assets/js/frontend.js',
			array(),
			$version,
			true
		);
	}

	/**
	 * Enqueues editor script in the block editor only.
	 *
	 * @return void
	 */
	public function enqueue_editor() {
		$handle = 'bhb-block-header-behavior-editor';
		$src    = BHB_PLUGIN_URL . 'assets/js/editor.js';
		$deps   = array(
			'wp-blocks',
			'wp-data',
			'wp-dom-ready',
			'wp-hooks',
			'wp-compose',
			'wp-components',
			'wp-block-editor',
			'wp-element',
			'wp-i18n',
		);

		wp_enqueue_script(
			$handle,
			$src,
			$deps,
			BHB_VERSION,
			true
		);

		wp_localize_script(
			$handle,
			'bhbBlockHeaderBehavior',
			array(
				'allowedModes' => Block::get_header_modes(),
				'inspector'    => Block::get_inspector_script_settings(),
			)
		);

		if ( function_exists( 'wp_set_script_translations' ) ) {
			wp_set_script_translations( $handle, 'block-header-behavior', BHB_PLUGIN_DIR . 'languages' );
		}
	}

	/**
	 * Enqueues frontend assets only when a matching block exists in relevant content.
	 *
	 * @return void
	 */
	public function maybe_enqueue_frontend() {
		if ( ! $this->should_load_frontend_assets() ) {
			return;
		}

		wp_enqueue_style( 'bhb-block-header-behavior' );
		wp_enqueue_script( 'bhb-block-header-behavior' );
	}

	/**
	 * Whether frontend CSS/JS should load for the current request.
	 *
	 * @return bool
	 */
	private function should_load_frontend_assets() {
		if ( null !== self::$frontend_needed ) {
			return self::$frontend_needed;
		}

		foreach ( $this->get_content_strings_to_scan() as $content ) {
			if ( $this->content_has_site_header_group( parse_blocks( $content ) ) ) {
				self::$frontend_needed = true;
				return true;
			}
		}

		self::$frontend_needed = false;
		return false;
	}

	/**
	 * Collects raw block markup sources for the current view.
	 *
	 * @return string[]
	 */
	private function get_content_strings_to_scan() {
		$sources = array();

		if ( is_singular() ) {
			$post = get_post();
			if ( $post instanceof \WP_Post && is_string( $post->post_content ) && '' !== $post->post_content ) {
				$sources[] = $post->post_content;
			}
		}

		if ( function_exists( 'wp_is_block_theme' ) && wp_is_block_theme() ) {
			$sources = array_merge( $sources, $this->get_block_theme_template_sources() );
		}

		/**
		 * Filters additional block markup strings scanned for the site header group.
		 *
		 * @since 1.0.0
		 *
		 * @param string[] $sources         Raw HTML / serialized blocks.
		 * @param Assets   $assets_instance This instance (for advanced use).
		 */
		$sources = apply_filters( 'bhb_header_behavior_scan_sources', $sources, $this );

		$sources = array_filter( array_map( 'strval', $sources ) );

		return array_values( array_unique( $sources ) );
	}

	/**
	 * Gathers template and template part content from the active block theme.
	 *
	 * @return string[]
	 */
	private function get_block_theme_template_sources() {
		$out = array();

		$template_types = array(
			'wp_template',
			'wp_template_part',
		);

		foreach ( $template_types as $type ) {
			$templates = get_block_templates( array(), $type );

			if ( is_array( $templates ) ) {
				foreach ( $templates as $template ) {
					if ( isset( $template->content ) && is_string( $template->content ) && '' !== $template->content ) {
						$out[] = $template->content;
					}
				}
			}
		}

		$db_posts = get_posts(
			array(
				'post_type'              => $template_types,
				'post_status'            => array( 'publish', 'draft' ),
				'posts_per_page'         => 200,
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		foreach ( $db_posts as $post ) {
			if ( $post instanceof \WP_Post && is_string( $post->post_content ) && '' !== $post->post_content ) {
				$out[] = $post->post_content;
			}
		}

		return $out;
	}

	/**
	 * Recursively checks parsed blocks for core/group with class site-header.
	 *
	 * @param array<int,array<string,mixed>> $blocks Parsed blocks from parse_blocks().
	 * @return bool
	 */
	private function content_has_site_header_group( $blocks ) {
		foreach ( $blocks as $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}

			$name = isset( $block['blockName'] ) ? (string) $block['blockName'] : '';

			if ( 'core/group' === $name ) {
				$class = '';
				if ( isset( $block['attrs']['className'] ) && is_string( $block['attrs']['className'] ) ) {
					$class = $block['attrs']['className'];
				}

				if ( '' !== $class && false !== strpos( $class, 'site-header' ) ) {
					return true;
				}
			}

			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				if ( $this->content_has_site_header_group( $block['innerBlocks'] ) ) {
					return true;
				}
			}
		}

		return false;
	}
}
