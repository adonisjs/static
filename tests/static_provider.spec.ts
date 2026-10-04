/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import fs from 'fs-extra'
import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import { IgnitorFactory } from '@adonisjs/core/factories'
import { HttpContextFactory } from '@adonisjs/core/factories/http'
import { defineConfig } from '../index.ts'
import StaticMiddleware from '../src/static_middleware.ts'

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

  test('index public files while booting the web environment', async ({ assert, cleanup }) => {
    cleanup(() => fs.remove(fileURLToPath(BASE_URL)))

    const ignitor = new IgnitorFactory()
      .withCoreProviders()
      .withCoreConfig()
      .merge({
        config: {
          static: defineConfig({ indexFiles: true }),
        },
        rcFileContents: {
          providers: [() => import('../providers/static_provider.js')],
        },
      })
      .create(BASE_URL)

    const app = ignitor.createApp('web')
    await app.init()
    await fs.outputFile(app.publicPath('style.css'), 'body {}')
    await app.boot()

    /**
     * A file added after boot is only missing from the index when the
     * directory has been scanned during boot.
     */
    await fs.outputFile(app.publicPath('added.txt'), 'new-file')
    const middleware = await app.container.make(StaticMiddleware)

    let nextCalled = false
    await middleware.handle(new HttpContextFactory().merge({ url: '/added.txt' }).create(), () => {
      nextCalled = true
    })
    assert.isTrue(nextCalled)
  })
})
