<?php
/**
 * Plugin Name: Squicky Player
 * Plugin URI: https://squicky.in/
 * Description: Privacy-first local and streaming media player for WordPress.
 * Version: 0.3.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: Squicky
 * License: MIT
 * Text Domain: squicky-player
 */

if (!defined('ABSPATH')) {
    exit;
}

define('SQUICKY_PLAYER_VERSION', '0.3.0');
define('SQUICKY_PLAYER_URL', plugin_dir_url(__FILE__));

/**
 * Register the self-hosted player module before blocks and shortcodes render.
 */
function squicky_player_register_assets()
{
    wp_register_script(
        'squicky-player',
        SQUICKY_PLAYER_URL . 'assets/bootstrap.js',
        array(),
        SQUICKY_PLAYER_VERSION,
        true
    );
}
add_action('init', 'squicky_player_register_assets', 5);

/**
 * Mark the bootstrap script as an ES module on supported WordPress versions.
 */
function squicky_player_module_tag($tag, $handle, $src)
{
    if ('squicky-player' !== $handle) {
        return $tag;
    }

    return sprintf(
        '<script type="module" src="%s" id="%s-js"></script>',
        esc_url($src),
        esc_attr($handle)
    );
}
add_filter('script_loader_tag', 'squicky_player_module_tag', 10, 3);

/**
 * Resolve and sanitize the source configuration.
 */
function squicky_player_source_from_attributes($attributes)
{
    $attachment_id = isset($attributes['id']) ? absint($attributes['id']) : 0;
    $source_url = $attachment_id ? wp_get_attachment_url($attachment_id) : '';

    if (!$source_url && !empty($attributes['src'])) {
        $source_url = esc_url_raw($attributes['src']);
    }

    return array(
        'src' => $source_url,
        'type' => isset($attributes['type']) ? sanitize_mime_type($attributes['type']) : '',
        'title' => isset($attributes['title']) ? sanitize_text_field($attributes['title']) : '',
        'poster' => isset($attributes['poster']) ? esc_url_raw($attributes['poster']) : '',
        'thumbnails' => isset($attributes['thumbnails']) ? esc_url_raw($attributes['thumbnails']) : '',
        'kind' => isset($attributes['kind']) && 'audio' === $attributes['kind'] ? 'audio' : 'video',
        'autoplay' => !empty($attributes['autoplay']) && filter_var($attributes['autoplay'], FILTER_VALIDATE_BOOLEAN),
        'muted' => !empty($attributes['muted']) && filter_var($attributes['muted'], FILTER_VALIDATE_BOOLEAN),
    );
}

/**
 * Render the player without exposing executable configuration.
 */
function squicky_player_render($attributes = array())
{
    $source = squicky_player_source_from_attributes($attributes);
    if (!$source['src']) {
        return current_user_can('upload_files')
            ? '<p class="squicky-player-notice">' . esc_html__('Choose a media attachment or provide a valid source URL.', 'squicky-player') . '</p>'
            : '';
    }

    wp_enqueue_script('squicky-player');

    $element_attributes = array(
        'src="' . esc_url($source['src']) . '"',
        'media-title="' . esc_attr($source['title']) . '"',
        'aria-label="' . esc_attr($source['title'] ?: __('Media player', 'squicky-player')) . '"',
    );

    if ($source['type']) {
        $element_attributes[] = 'type="' . esc_attr($source['type']) . '"';
    }
    if ($source['poster']) {
        $element_attributes[] = 'poster="' . esc_url($source['poster']) . '"';
    }
    if ($source['thumbnails']) {
        $element_attributes[] = 'thumbnails="' . esc_url($source['thumbnails']) . '"';
    }
    if ('audio' === $source['kind']) {
        $element_attributes[] = 'audio';
    }
    if ($source['autoplay']) {
        $element_attributes[] = 'autoplay';
    }
    if ($source['muted']) {
        $element_attributes[] = 'muted';
    }

    return '<div class="wp-block-squicky-player"><squicky-player ' .
        implode(' ', $element_attributes) .
        '></squicky-player></div>';
}

/**
 * Classic Editor and page-builder integration.
 *
 * Example:
 * [squicky_player id="123" poster="https://example.com/poster.jpg"]
 */
function squicky_player_shortcode($attributes)
{
    return squicky_player_render(shortcode_atts(
        array(
            'id' => 0,
            'src' => '',
            'type' => '',
            'title' => '',
            'poster' => '',
            'thumbnails' => '',
            'kind' => 'video',
            'autoplay' => false,
            'muted' => false,
        ),
        $attributes,
        'squicky_player'
    ));
}
add_shortcode('squicky_player', 'squicky_player_shortcode');

/**
 * Register the server-rendered Gutenberg block.
 */
function squicky_player_register_block()
{
    register_block_type(
        __DIR__,
        array('render_callback' => 'squicky_player_render')
    );
}
add_action('init', 'squicky_player_register_block');
