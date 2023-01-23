/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import fs from 'fs-extra'
import { join } from 'node:path'
import supertest from 'supertest'
import { test } from '@japa/runner'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import {
  RequestFactory,
  ResponseFactory,
  HttpContextFactory,
} from '@adonisjs/http-server/factories'

import StaticMiddleware from '../src/static_middleware.js'

const BASE_URL = new URL('./tmp/', import.meta.url)
const BASE_PATH = fileURLToPath(BASE_URL)

test.group('Serve Static', (group) => {
  group.each.teardown(async () => {
    await fs.remove(BASE_PATH)
  })

  test('serve static file when it exists', async ({ assert }) => {
    await fs.outputFile(join(BASE_PATH, 'public/style.css'), 'body { background: #000 }')

    const server = createServer(async (req, res) => {
      const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), {
        enabled: true,
      })

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
      const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), {
        enabled: true,
      })

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
      const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), {
        enabled: true,
      })

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
      const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), {
        enabled: true,
      })

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

  test('set headers defined via config', async ({ assert }) => {
    await fs.outputFile(join(BASE_PATH, 'public/style.css'), 'body { background: #000 }')

    const server = createServer(async (req, res) => {
      const serveStatic = new StaticMiddleware(join(BASE_PATH, 'public'), {
        enabled: true,
        headers(path) {
          return {
            'X-Custom-Path': path,
          }
        },
      })

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
