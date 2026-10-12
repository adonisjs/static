/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import fs from 'fs-extra'
import nodeFs from 'node:fs'
import { join } from 'node:path'
import { mock } from 'node:test'
import supertest from 'supertest'
import { test } from '@japa/runner'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { RequestFactory, ResponseFactory, HttpContextFactory } from '@adonisjs/core/factories/http'

import { defineConfig } from '../index.ts'
import StaticMiddleware from '../src/static_middleware.ts'

const BASE_URL = new URL('./tmp/', import.meta.url)
const BASE_PATH = fileURLToPath(BASE_URL)

test.group('Serve Static', (group) => {
  group.each.teardown(async () => {
    await fs.remove(BASE_PATH)
  })

  test('serve static file when it exists', async ({ assert }) => {
    await fs.outputFile(join(BASE_PATH, 'public/style.css'), 'body { background: #000 }')

    const server = createServer(async (req, res) => {
      const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({}))

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await serveStatic.handle(ctx, () => {
        throw new Error('Do not call next when file is served')
      })
    })

    const { text } = await supertest(server).get('/style.css')
    assert.equal(text, 'body { background: #000 }')
  })

  test('flush headers set before the static files hook', async ({ assert }) => {
    await fs.outputFile(join(BASE_PATH, 'public/style.css'), 'body { background: #000 }')

    const server = createServer(async (req, res) => {
      const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({}))

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      ctx.response.header('x-powered-by', 'adonis')
      await serveStatic.handle(ctx, () => {
        throw new Error('Do not call next when file is served')
      })
    })

    const { text, headers } = await supertest(server).get('/style.css')
    assert.property(headers, 'x-powered-by')
    assert.equal(headers['x-powered-by'], 'adonis')
    assert.equal(text, 'body { background: #000 }')
  })

  test('call next when not serving file', async () => {
    const server = createServer(async (req, res) => {
      const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({}))

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await serveStatic.handle(ctx, () => {
        ctx.response.status(404).send('404')
        ctx.response.finish()
      })
    })

    await supertest(server).get('/').expect(404)
  })

  test('report errors raised by the next function', async ({ assert }) => {
    const server = createServer(async (req, res) => {
      const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({}))

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      try {
        await serveStatic.handle(ctx, () => {
          throw new Error('Route not found')
        })
      } catch (error) {
        response.status(404).send(error.message)
      } finally {
        response.finish()
      }
    })

    const { text } = await supertest(server).get('/').expect(404)
    assert.equal(text, 'Route not found')
  })

  test('serve files inside dotfile directories when dotFiles is allow', async ({ assert }) => {
    await fs.outputFile(
      join(BASE_PATH, 'public/.well-known/apple-developer-merchantid-domain-association'),
      'merchant-id-content'
    )

    const server = createServer(async (req, res) => {
      const serveStatic = new StaticMiddleware(
        join(BASE_PATH, 'public'),
        defineConfig({ dotFiles: 'allow' })
      )

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await serveStatic.handle(ctx, () => {
        ctx.response.status(404).send('404')
        ctx.response.finish()
      })
    })

    const res = await supertest(server)
      .get('/.well-known/apple-developer-merchantid-domain-association')
      .expect(200)

    assert.equal(Buffer.from(res.body).toString(), 'merchant-id-content')
  })

  test('ignore dotfiles by default', async () => {
    await fs.outputFile(join(BASE_PATH, 'public/.env'), 'SECRET=123')

    const server = createServer(async (req, res) => {
      const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({}))

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await serveStatic.handle(ctx, () => {
        ctx.response.status(404).send('404')
        ctx.response.finish()
      })
    })

    await supertest(server).get('/.env').expect(404)
  })

  test('set headers defined via config', async ({ assert }) => {
    await fs.outputFile(join(BASE_PATH, 'public/style.css'), 'body { background: #000 }')

    const server = createServer(async (req, res) => {
      const serveStatic = new StaticMiddleware(
        join(BASE_PATH, 'public'),
        defineConfig({
          headers(path) {
            return {
              'X-Custom-Path': path,
            }
          },
        })
      )

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await serveStatic.handle(ctx, () => {
        throw new Error('Next should not have been called')
      })
    })

    const { text, headers } = await supertest(server).get('/style.css')
    assert.property(headers, 'x-custom-path')
    assert.equal(headers['x-custom-path'], join(BASE_PATH, 'public', 'style.css'))
    assert.equal(text, 'body { background: #000 }')
  })
})

test.group('Serve Static | prefixes', (group) => {
  group.each.teardown(async () => {
    mock.restoreAll()
    await fs.remove(BASE_PATH)
  })

  function createStaticServer(prefixes: string[]) {
    const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({ prefixes }))

    return createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await serveStatic.handle(ctx, () => {
        ctx.response.status(404).send('404')
        ctx.response.finish()
      })
    })
  }

  test('serve files under a prefix', async () => {
    await fs.outputFile(join(BASE_PATH, 'public/assets/app.js'), 'app')
    await fs.outputFile(join(BASE_PATH, 'public/robots.txt'), 'User-agent: *')
    const server = createStaticServer(['/assets', '/robots.txt'])

    await supertest(server).get('/assets/app.js?v=3').expect(200, 'app')
    await supertest(server).get('/robots.txt').expect(200, 'User-agent: *')
    await supertest(server).get('/assets').expect(301).expect('Location', '/assets/')
  })

  test('skip filesystem lookups outside the prefixes', async ({ assert }) => {
    await fs.outputFile(join(BASE_PATH, 'public/logo.png'), 'logo')
    await fs.outputFile(join(BASE_PATH, 'public/assets-old/app.js'), 'old')
    const server = createStaticServer(['/assets'])
    const stat = mock.method(nodeFs, 'stat')

    await supertest(server).get('/dashboard?tab=assets').expect(404)
    await supertest(server).get('/logo.png').expect(404)
    await supertest(server).get('/assets-old/app.js').expect(404)
    assert.equal(stat.mock.callCount(), 0)

    await supertest(server).get('/assets/missing.js').expect(404)
    assert.equal(stat.mock.callCount(), 1)
  })

  test('ignore trailing slashes in prefixes', async () => {
    await fs.outputFile(join(BASE_PATH, 'public/assets/app.js'), 'app')
    const server = createStaticServer(['/assets/'])

    await supertest(server).get('/assets/app.js').expect(200, 'app')
  })

  test('match only the root path with the "/" prefix', async () => {
    await fs.outputFile(join(BASE_PATH, 'public/index.html'), 'home')
    await fs.outputFile(join(BASE_PATH, 'public/style.css'), 'body {}')
    const server = createStaticServer(['/'])

    await supertest(server).get('/').expect(200, 'home')
    await supertest(server).get('/style.css').expect(404)
  })

  test('serve no file when prefixes are empty', async () => {
    await fs.outputFile(join(BASE_PATH, 'public/style.css'), 'body {}')
    const server = createStaticServer([])

    await supertest(server).get('/style.css').expect(404)
  })

  test('propagate errors from next when skipping a request', async ({ assert }) => {
    const serveStatic = new StaticMiddleware(
      join(BASE_PATH, 'public'),
      defineConfig({ prefixes: ['/assets'] })
    )
    const ctx = new HttpContextFactory().merge({ url: '/dashboard' }).create()

    await assert.rejects(
      () =>
        serveStatic.handle(ctx, () => {
          throw new Error('next failed')
        }),
      'next failed'
    )
  })
})
