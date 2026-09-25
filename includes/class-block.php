<?php
/**
 * Registers block type extensions and variations.
 *
 * @package BHB\BlockHeaderBehavior
 */

namespace BHB\BlockHeaderBehavior;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Extends core/group with headerMode and registers the site-header variation.
 *
 * @since 1.0.0
 */
final class Block {

	/**
	 * Registers WordPress hooks.
	 *
	 * @return void
	 */
	public function register_hooks() {
		add_filter( 'register_block_type_args', array( $this, 'extend_core_group' ), 10, 2 );
		add_filter( 'get_block_type_variations', array( $this, 'register_site_header_variation' ), 10, 2 );
	}

	/**
	 * Inspector panel keys that may be hidden for the Site Header variation.
	 *
	 * @return string[]
	 */
	public static function get_hidden_inspector_panel_keys() {
		return array( 'layout', 'position' );
	}

	/**
	 * Which inspector panels to hide when Site Header is selected (editor only).
	 *
	 * Keys: `layout` (core string "Layout", "Apresentação" in pt_BR), `position`.
	 * Default hides both (layout is redundant for this wrapper; position conflicts with plugin modes).
	 *
	 * @return string[]
	 */
	public static function get_hidden_inspector_panels() {
		$allowed = self::get_hidden_inspector_panel_keys();
		/**
		 * Filters inspector panels hidden when the Site Header variation is selected.
		 *
		 * @since 1.0.0
		 *
		 * @param string[] $panels Panel keys. Allowed: `layout`, `position`.
		 */
		$panels = apply_filters(
			'bhb_site_header_hidden_inspector_panels',
			array(
				'layout',
				'position',
			)
		);
		$panels = array_map( 'strval', (array) $panels );

		return array_values( array_intersect( $allowed, $panels ) );
	}

	/**
	 * Localized strings for matching inspector UI (core text domains).
	 *
	 * @return array<string,string>
	 */
	public static function get_inspector_panel_titles() {
		return array(
			'layout'   => __( 'Layout', 'default' ),
			'position' => __( 'Position', 'default' ),
		);
	}

	/**
	 * Settings passed to the block editor script for inspector masking.
	 *
	 * @return array<string,mixed>
	 */
	public static function get_inspector_script_settings() {
		return array(
			'hiddenPanels' => self::get_hidden_inspector_panels(),
			'panelTitles'  => self::get_inspector_panel_titles(),
		);
	}

	/**
	 * Returns allowed header mode values (filterable for extensions).
	 *
	 * @return string[]
	 */
	public static function get_header_modes() {
		/**
		 * Filters the list of valid header modes.
		 *
		 * @since 1.0.0
		 *
		 * @param string[] $modes Mode slugs.
		 */
		return apply_filters(
			'bhb_header_modes',
			array(
				'default',
				'sticky',
				'overlay',
			)
		);
	}

	/**
	 * Sanitizes a CSS color value for scrolled header custom properties.
	 *
	 * @param mixed $value Raw attribute.
	 * @return string Safe value or empty string.
	 */
	public static function sanitize_scrolled_background( $value ) {
		if ( ! is_string( $value ) ) {
			return '';
		}
		$value = trim( wp_strip_all_tags( $value ) );
		if ( strlen( $value ) > 800 ) {
			return '';
		}
		if ( '' === $value ) {
			return '';
		}
		if ( preg_match( '/[<>"{}]|expression|javascript\s*:|@import/i', $value ) ) {
			return '';
		}

		return $value;
	}

	/**
	 * Sanitizes a box-shadow value for scrolled header custom properties.
	 *
	 * @param mixed $value Raw attribute.
	 * @return string Safe value or empty string.
	 */
	public static function sanitize_scrolled_shadow( $value ) {
		if ( ! is_string( $value ) ) {
			return '';
		}
		$value = trim( wp_strip_all_tags( $value ) );
		if ( strlen( $value ) > 800 ) {
			return '';
		}
		if ( '' === $value ) {
			return '';
		}
		if ( preg_match( '/^none$/i', $value ) ) {
			return 'none';
		}
		if ( preg_match( '/[<>"{};]|expression|javascript\s*:|@import/i', $value ) ) {
			return '';
		}

		return $value;
	}

	/**
	 * Adds the headerMode attribute to core/group.
	 *
	 * @param array<string,mixed> $args       Block type args.
	 * @param string              $block_name Block name.
	 * @return array<string,mixed>
	 */
	public function extend_core_group( $args, $block_name ) {
		if ( 'core/group' !== $block_name ) {
			return $args;
		}

		if ( ! isset( $args['attributes'] ) || ! is_array( $args['attributes'] ) ) {
			$args['attributes'] = array();
		}

		$args['attributes']['headerMode'] = array(
			'type'    => 'string',
			'default' => 'default',
			'enum'    => self::get_header_modes(),
		);

		$args['attributes']['headerScrolledBackground'] = array(
			'type'    => 'string',
			'default' => '',
		);

		$args['attributes']['headerScrolledShadow'] = array(
			'type'    => 'string',
			'default' => '',
		);

		return $args;
	}

	/**
	 * Appends the site-header variation to core/group (WordPress 6.5+ API).
	 *
	 * The editor re-registers this variation in assets/js/editor.js with an `isActive`
	 * callback so the correct item appears selected under "Transform variation".
	 * PHP/JSON cannot provide `isActive` as a function (Row/Stack/Grid use `isActive` arrays).
	 *
	 * Note: {@see register_block_variation()} is not part of core; variations from PHP
	 * must be added via this filter.
	 *
	 * @param array<int|string,array<string,mixed>> $variations Existing variations.
	 * @param \WP_Block_Type                          $block_type Block type instance.
	 * @return array<int|string,array<string,mixed>>
	 */
	public function register_site_header_variation( $variations, $block_type ) {
		if ( ! $block_type instanceof \WP_Block_Type ) {
			return $variations;
		}

		if ( 'core/group' !== $block_type->name ) {
			return $variations;
		}

		if ( ! is_array( $variations ) ) {
			$variations = array();
		}

		foreach ( $variations as $variation ) {
			if ( is_array( $variation ) && isset( $variation['name'] ) && 'site-header' === $variation['name'] ) {
				return $variations;
			}
		}

		$variations[] = array(
			'name'        => 'site-header',
			'title'       => __( 'Site Header', 'block-header-behavior' ),
			/* translators: Block variation description. */
			'description' => __( 'Semantic header group with optional sticky or overlay behavior.', 'block-header-behavior' ),
			'attributes'  => array(
				'tagName'                  => 'header',
				'className'                => 'site-header',
				'headerMode'               => 'default',
				'headerScrolledBackground' => '',
				'headerScrolledShadow'     => '',
			),
			'scope'       => array( 'inserter', 'transform' ),
			'keywords'    => array(
				__( 'header', 'block-header-behavior' ),
				__( 'navigation', 'block-header-behavior' ),
				__( 'banner', 'block-header-behavior' ),
			),
		);

		return $variations;
	}
}
