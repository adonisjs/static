/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'
import { defineConfig } from '../src/define_config.ts'
import StaticMiddleware from '../src/static_middleware.ts'

/**
 * Static files provider to configure StaticMiddleware using the
 * configuration saved inside the config/static.ts file.
 * 
 * This provider is responsible for registering the StaticMiddleware with the
 * IoC container, binding it with the application's public path and static configuration.
 * It integrates seamlessly with AdonisJS's service provider system.
 * 
 * @example
 * ```ts
 * // Usage in providers array in adonisrc.ts
 * providers: [
 *   () => import('@adonisjs/static/static_provider')
 * ]
 * ```
 */
export default class StaticProvider {
  /**
   * Creates a new StaticProvider instance.
   * 
   * @param app - The AdonisJS application service instance providing access to container, config, and public path
   * 
   * @example
   * ```ts
   * const provider = new StaticProvider(app)
   * ```
   */
  constructor(protected app: ApplicationService) {}

  /**
   * Register the StaticMiddleware with the IoC container.
   * 
   * This method binds StaticMiddleware to the container, configuring it with:
   * - The application's public path (typically './public')
   * - Static configuration from config/static.ts or default configuration
   * 
   * The middleware is registered as a singleton and can be resolved from
   * the container when needed by the HTTP server.
   * 
   * @example
   * ```ts
   * // Called automatically during application boot
   * provider.register()
   * 
   * // Later resolved from container
   * const middleware = await app.container.make(StaticMiddleware)
   * ```
   */
  register() {
    this.app.container.bind(StaticMiddleware, () => {
      const publicPath = this.app.publicPath()
      const config = this.app.config.get<any>('static', defineConfig({}))
      return new StaticMiddleware(publicPath, config)
    })
  }
}
