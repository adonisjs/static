/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type AssetsConfig } from './types.ts'

/**
 * Define configuration for serving static assets.
 *
 * This function creates a complete AssetsConfig object by merging user-provided
 * configuration with sensible defaults. It ensures all required properties are
 * present while allowing customization of specific options.
 *
 * @param config - Partial configuration object to customize static asset serving behavior
 *
 * @example
 * ```ts
 * const config = defineConfig({
 *   maxAge: '1d',
 *   etag: false,
 *   dotFiles: 'deny'
 * })
 * ```
 *
 * @example
 * ```ts
 * // Minimal configuration with defaults
 * const config = defineConfig({})
 * ```
 */
export function defineConfig(config: Partial<AssetsConfig>): AssetsConfig {
  return {
    enabled: true,
    dotFiles: 'ignore',
    etag: true,
    lastModified: true,
    ...config,
  }
}
