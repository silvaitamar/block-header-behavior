<?php
/**
 * Plugin Name:       Block Header Behavior
 * Plugin URI:        https://github.com/silvaitamar/block-header-behavior
 * Description:       Extends the block editor with configurable site header behaviors (default, sticky, overlay) via a core/group variation.
 * Version:           1.0.1
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Itamar Silva
 * Author URI:        https://github.com/silvaitamar
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       block-header-behavior
 * Domain Path:       /languages
 *
 * @package BHB\BlockHeaderBehavior
 */

namespace BHB\BlockHeaderBehavior;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Plugin version (keep in sync with the Version header above).
 */
define( 'BHB_VERSION', '1.0.1' );

define( 'BHB_PLUGIN_FILE', __FILE__ );
define( 'BHB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BHB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

require_once BHB_PLUGIN_DIR . 'includes/class-block.php';
require_once BHB_PLUGIN_DIR . 'includes/class-assets.php';
require_once BHB_PLUGIN_DIR . 'includes/class-plugin.php';

/**
 * Returns the main plugin instance.
 *
 * @return Plugin
 */
function bhb_plugin() {
	return Plugin::instance();
}

bhb_plugin()->init();
