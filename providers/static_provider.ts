/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Application } from '@adonisjs/application'
import StaticMiddleware from '../src/static_middleware.js'

export default class CorsProvider {
  constructor(protected app: Application<any>) {}

  register() {
    this.app.container.bind(StaticMiddleware, () => {
      const publicPath = this.app.publicPath()
      const config = this.app.config.get<any>('static', {})
      return new StaticMiddleware(publicPath, config)
    })
  }
}
