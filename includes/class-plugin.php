<?php
/**
 * Core plugin bootstrap and wiring.
 *
 * @package BHB\BlockHeaderBehavior
 */

namespace BHB\BlockHeaderBehavior;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Singleton entry point for Block Header Behavior.
 *
 * @since 1.0.0
 */
final class Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var Plugin|null
	 */
	private static $instance = null;

	/**
	 * Block registration / variation handler.
	 *
	 * @var Block
	 */
	private $block;

	/**
	 * Asset loader.
	 *
	 * @var Assets
	 */
	private $assets;

	/**
	 * Gets the singleton instance.
	 *
	 * @return Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	/**
	 * Constructor.
	 */
	private function __construct() {
		$this->block  = new Block();
		$this->assets = new Assets();
	}

	/**
	 * Initializes hooks.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'init', array( $this, 'load_textdomain' ), 0 );
		$this->block->register_hooks();
		$this->assets->register_hooks();
	}

	/**
	 * Loads plugin translations (runs on `init` as recommended by WordPress).
	 *
	 * @return void
	 */
	public function load_textdomain() {
		load_plugin_textdomain(
			'block-header-behavior',
			false,
			dirname( plugin_basename( BHB_PLUGIN_FILE ) ) . '/languages'
		);
	}
}
