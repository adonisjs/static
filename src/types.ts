/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Stats } from 'node:fs'

/**
 * Configuration options for static file server.
 *
 * This type defines all available options for configuring how static assets
 * are served, including caching behavior, security settings, and custom headers.
 *
 * @example
 * ```ts
 * const config: AssetsConfig = {
 *   enabled: true,
 *   maxAge: '1d',
 *   etag: true,
 *   dotFiles: 'deny'
 * }
 * ```
 *
 * @example
 * ```ts
 * // Configuration with custom headers
 * const config: AssetsConfig = {
 *   enabled: true,
 *   headers: (path, stats) => ({
 *     'X-Custom-Header': 'value',
 *     'X-File-Size': stats.size.toString()
 *   })
 * }
 * ```
 */
export type AssetsConfig = {
  /**
   * Whether static file serving is enabled
   */
  enabled: boolean

  /**
   * Enable or disable accepting ranged requests.
   * When enabled, supports partial content requests (HTTP 206 responses)
   */
  acceptRanges?: boolean

  /**
   * Enable or disable setting Cache-Control response header.
   * When enabled, sets appropriate caching headers based on other options
   */
  cacheControl?: boolean

  /**
   * How to treat dotfiles (files starting with a dot).
   * - 'ignore': Ignore dotfiles (default behavior)
   * - 'allow': Serve dotfiles normally
   * - 'deny': Return 403 Forbidden for dotfiles
   */
  dotFiles?: 'ignore' | 'allow' | 'deny'

  /**
   * Enable or disable etag generation.
   * ETags help with caching by providing a unique identifier for file versions
   */
  etag?: boolean

  /**
   * Enable or disable Last-Modified header.
   * Helps browsers determine if cached files are still valid
   */
  lastModified?: boolean

  /**
   * Set the max-age property of the Cache-Control header.
   * Can be a number in milliseconds or a string like '1d', '2h', '30m'
   */
  maxAge?: number | string

  /**
   * Enable or disable the immutable directive in the Cache-Control header.
   * When true, indicates that the response will not change during its lifetime
   */
  immutable?: boolean

  /**
   * Function to set custom headers on the response.
   * Called for each served file with the file path and stats
   *
   * @param path - The path to the file being served
   * @param stats - Node.js fs.Stats object with file information
   */
  headers?: (path: string, stats: Stats) => Record<string, any>
}
