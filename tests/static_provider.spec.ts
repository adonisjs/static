/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { IgnitorFactory } from '@adonisjs/core/factories'
import StaticMiddleware from '../src/static_middleware.js'

const BASE_URL = new URL('./tmp/', import.meta.url)

test.group('Static provider', () => {
  test('construct middleware using container', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .withCoreProviders()
      .withCoreConfig()
      .merge({
        config: {
          static: {
            enabled: true,
          },
        },
        rcFileContents: {
          providers: [() => import('../providers/static_provider.js')],
        },
      })
      .create(BASE_URL)

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    await assert.doesNotReject(() => app.container.make(StaticMiddleware))
    assert.instanceOf(await app.container.make(StaticMiddleware), StaticMiddleware)
  })
})
