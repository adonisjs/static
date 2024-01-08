/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'
import StaticMiddleware from '../src/static_middleware.js'
import { defineConfig } from '../src/define_config.js'

/**
 * Static files provider to configure Static middleware using the
 * config saved inside config/static.ts file.
 */
export default class StaticProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(StaticMiddleware, () => {
      const publicPath = this.app.publicPath()
      const config = this.app.config.get<any>('static', defineConfig({}))
      return new StaticMiddleware(publicPath, config)
    })
  }
}
