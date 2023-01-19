/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { AssetsConfig } from './types.js'

/**
 * Define config for serving static assets
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
