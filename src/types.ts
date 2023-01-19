/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Stats } from 'node:fs'

/**
 * Config for static file server
 */
export type AssetsConfig = {
  enabled: boolean
  acceptRanges?: boolean
  cacheControl?: boolean
  dotFiles?: 'ignore' | 'allow' | 'deny'
  etag?: boolean
  lastModified?: boolean
  maxAge?: number | string
  immutable?: boolean
  headers?: (path: string, stats: Stats) => Record<string, any>
}
