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

test.group('Indexed static files', (group) => {
  group.each.teardown(async () => {
    mock.restoreAll()
    await fs.remove(BASE_PATH)
  })

  function createStaticServer(middleware: StaticMiddleware) {
    return createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await middleware.handle(ctx, () => {
        ctx.response.status(404).send('404')
        ctx.response.finish()
      })
    })
  }

  test('skip filesystem lookups for missing GET and HEAD paths', async ({ assert }) => {
    await fs.outputFile(join(BASE_PATH, 'public/style.css'), 'body {}')
    const middleware = new StaticMiddleware(
      join(BASE_PATH, 'public'),
      defineConfig({ indexFiles: true })
    )
    const stat = mock.method(nodeFs, 'stat')
    const server = createStaticServer(middleware)

    await supertest(server).get('/dashboard?tab=settings').expect(404)
    await supertest(server).head('/assets/missing.js').expect(404)
    await supertest(server).post('/style.css').expect(404)

    assert.equal(stat.mock.callCount(), 0)
  })

  test('preserve file contents, headers, HEAD, conditional and range responses', async ({
    assert,
  }) => {
    const content = 'body { background: #123456 }'
    await fs.outputFile(join(BASE_PATH, 'public/assets/style.css'), content)
    await fs.outputFile(join(BASE_PATH, 'public/robots.txt'), 'User-agent: *')
    const middleware = new StaticMiddleware(
      join(BASE_PATH, 'public'),
      defineConfig({ indexFiles: true, headers: () => ({ 'X-Static': 'indexed' }) })
    )
    const stat = mock.method(nodeFs, 'stat')
    const server = createStaticServer(middleware)

    const response = await supertest(server).get('/assets/style.css?v=37').expect(200)
    assert.equal(response.text, content)
    assert.equal(response.headers['x-static'], 'indexed')
    assert.property(response.headers, 'etag')
    assert.property(response.headers, 'last-modified')
    await supertest(server).get('/robots.txt').expect(200, 'User-agent: *')
    const head = await supertest(server).head('/assets/style.css').expect(200)
    assert.equal(head.headers['content-length'], String(content.length))
    assert.isUndefined(head.text)
    await supertest(server)
      .get('/assets/style.css')
      .set('If-None-Match', response.headers.etag)
      .expect(304)
    const range = await supertest(server)
      .get('/assets/style.css')
      .set('Range', 'bytes=2-11')
      .expect(206)
    assert.equal(range.text, content.slice(2, 12))
    assert.isAtLeast(stat.mock.callCount(), 5)
  })

  test('decode paths once and normalize encoded separators', async ({ assert }) => {
    await fs.outputFile(join(BASE_PATH, 'public/assets/100%.css'), 'literal-percent')
    await fs.outputFile(join(BASE_PATH, 'public/assets/percent%25.css'), 'encoded-percent')
    const server = createStaticServer(
      new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({ indexFiles: true }))
    )

    await supertest(server).get('/assets%2F100%25.css?version=1').expect(200, 'literal-percent')
    await supertest(server).get('/assets/percent%2525.css').expect(200, 'encoded-percent')
    const normalized = await supertest(server).get('//assets/100%25.css').expect(200)
    assert.equal(normalized.text, 'literal-percent')
  })

  test('leave case and Unicode variants to the filesystem', async ({ assert }) => {
    const variants = [
      ['Case.css', 'case.css'],
      ['Σ.css', 'ς.css'],
      ['cafe\u0301.css', 'café.css'],
      ['ß.css', 'ẞ.css'],
      ['Θ.css', 'ϴ.css'],
    ]
    const exists = await Promise.all(
      variants.map(async ([filename, requested]) => {
        await fs.outputFile(join(BASE_PATH, 'public', filename), filename)
        return fs.pathExists(join(BASE_PATH, 'public', requested))
      })
    )
    const server = createStaticServer(
      new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({ indexFiles: true }))
    )
    const stat = mock.method(nodeFs, 'stat')

    for (const [index, [filename, requested]] of variants.entries()) {
      const lookups = stat.mock.callCount()
      const response = await supertest(server)
        .get(`/${encodeURIComponent(requested)}`)
        .expect(exists[index] ? 200 : 404)
      assert.equal(response.text, exists[index] ? filename : '404')
      assert.isAbove(stat.mock.callCount(), lookups)
    }
  })

  test('preserve directory redirects and index files', async () => {
    await fs.outputFile(join(BASE_PATH, 'public/index.html'), 'home')
    await fs.outputFile(join(BASE_PATH, 'public/docs/index.html'), 'documentation')
    const server = createStaticServer(
      new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({ indexFiles: true }))
    )

    await supertest(server).get('/').expect(200, 'home')
    await supertest(server).get('/docs?lang=fr').expect(301).expect('Location', '/docs/?lang=fr')
    await supertest(server).get('/docs/').expect(200, 'documentation')
  })

  test('skip filesystem lookups for directories without an index file', async ({ assert }) => {
    await fs.outputFile(join(BASE_PATH, 'public/assets/app.js'), 'app')
    await fs.outputFile(join(BASE_PATH, 'public/docs/Index.html'), 'documentation')
    const docsIndexExists = await fs.pathExists(join(BASE_PATH, 'public/docs/index.html'))
    const server = createStaticServer(
      new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({ indexFiles: true }))
    )
    const stat = mock.method(nodeFs, 'stat')

    await supertest(server).get('/').expect(404)
    await supertest(server).get('/?page=2').expect(404)
    await supertest(server).get('/assets/').expect(404)
    await supertest(server).get('/assets/app.js/').expect(404)
    assert.equal(stat.mock.callCount(), 0)

    await supertest(server).get('/assets').expect(301).expect('Location', '/assets/')
    await supertest(server)
      .get('/docs/')
      .expect(docsIndexExists ? 200 : 404)
    assert.isAbove(stat.mock.callCount(), 0)
  })

  test('keep dotfile rules and path traversal protection', async () => {
    await fs.outputFile(join(BASE_PATH, 'public/.env'), 'hidden')
    await fs.outputFile(join(BASE_PATH, 'public/.well-known/proof.txt'), 'proof')
    await fs.outputFile(join(BASE_PATH, 'secret.txt'), 'outside-public')
    const server = createStaticServer(
      new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({ indexFiles: true }))
    )

    await supertest(server).get('/.env').expect(404, '404')
    await supertest(server).get('/%2e%2e/secret.txt').expect(404, '404')
    await supertest(server).get('/%00').expect(404, '404')
    const allowed = createStaticServer(
      new StaticMiddleware(
        join(BASE_PATH, 'public'),
        defineConfig({ indexFiles: true, dotFiles: 'allow' })
      )
    )
    await supertest(allowed).get('/.well-known/proof.txt').expect(200, 'proof')
  })

  test('only opt-in indexing hides files added after construction', async () => {
    await fs.ensureDir(join(BASE_PATH, 'public'))
    const indexed = createStaticServer(
      new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({ indexFiles: true }))
    )
    const live = createStaticServer(
      new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({}))
    )

    await fs.outputFile(join(BASE_PATH, 'public/added.txt'), 'new-file')
    await supertest(indexed).get('/added.txt').expect(404)
    await supertest(live).get('/added.txt').expect(200, 'new-file')
  })

  test('resolve symlinks without indexing their targets', async ({ assert }) => {
    await fs.outputFile(join(BASE_PATH, 'outside/original.txt'), 'original')
    await fs.ensureDir(join(BASE_PATH, 'public'))
    await fs.symlink(join(BASE_PATH, 'outside'), join(BASE_PATH, 'public/linked'), 'dir')
    await fs.symlink(
      join(BASE_PATH, 'outside/original.txt'),
      join(BASE_PATH, 'public/alias.txt'),
      'file'
    )
    const server = createStaticServer(
      new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({ indexFiles: true }))
    )
    await fs.outputFile(join(BASE_PATH, 'outside/added.txt'), 'added')
    const stat = mock.method(nodeFs, 'stat')

    await supertest(server).get('/linked/original.txt').expect(200, 'original')
    await supertest(server).get('/alias.txt').expect(200, 'original')
    await supertest(server).get('/linked/added.txt').expect(200, 'added')
    const lookups = stat.mock.callCount()
    assert.isAtLeast(lookups, 3)
    await supertest(server).get('/linked-other/missing.txt').expect(404)
    assert.equal(stat.mock.callCount(), lookups)
  })

  test('fall through after removing an indexed file or with a missing public directory', async () => {
    await fs.outputFile(join(BASE_PATH, 'public/style.css'), 'body {}')
    const server = createStaticServer(
      new StaticMiddleware(join(BASE_PATH, 'public'), defineConfig({ indexFiles: true }))
    )
    await fs.remove(join(BASE_PATH, 'public/style.css'))
    await supertest(server).get('/style.css').expect(404)

    const missing = createStaticServer(
      new StaticMiddleware(join(BASE_PATH, 'missing'), defineConfig({ indexFiles: true }))
    )
    await supertest(missing).get('/assets/missing.css').expect(404)
  })

  test('propagate errors from next when skipping an unindexed path', async ({ assert }) => {
    await fs.ensureDir(join(BASE_PATH, 'public'))
    const middleware = new StaticMiddleware(
      join(BASE_PATH, 'public'),
      defineConfig({ indexFiles: true })
    )
    const ctx = new HttpContextFactory().merge({ url: '/dashboard' }).create()

    await assert.rejects(
      () =>
        middleware.handle(ctx, () => {
          throw new Error('next failed')
        }),
      'next failed'
    )
  })
})
