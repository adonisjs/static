/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ServerResponse } from 'node:http'
import staticServer, { type RequestHandler } from 'serve-static'

import type { AssetsConfig } from './types.js'
import type { NextFn } from '@adonisjs/http-server/types'
import type { HttpContext, Response } from '@adonisjs/http-server'

/**
 * Middleware to serve static assets from a pre-defined directory
 */
export class StaticMiddleware {
  #sendFile: RequestHandler<ServerResponse & { parent?: Response }>

  constructor(publicPath: string, config: AssetsConfig) {
    this.#sendFile = staticServer(publicPath, {
      ...config,
      fallthrough: true,
      setHeaders: (res, path, stats) => {
        const headers = res.parent!.getHeaders()
        Object.keys(headers).forEach((key) => {
          const value = headers[key]
          if (value) {
            res.setHeader(key, value)
          }
        })

        /**
         * Set user defined custom headers
         */
        if (typeof config.headers === 'function') {
          const customHeaders = config.headers(path, stats)
          Object.keys(customHeaders).forEach((key) => {
            res.setHeader(key, customHeaders[key])
          })
        }
      },
    })
  }

  /**
   * Handle the request to serve static files.
   */
  async handle({ request, response }: HttpContext, next: NextFn) {
    const serveStaticResponse: ServerResponse & { parent?: Response } = response.response
    serveStaticResponse['parent'] = response

    /**
     * We need to await the middleware until the file has been served, otherwise
     * AdonisJS HTTP server will call `response.finish` before the file stream
     * is written to the response socket.
     */
    return new Promise<void>((resolve, reject) => {
      function done(error?: any) {
        response.response.removeListener('finish', done)
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      }

      response.response.addListener('finish', done)
      this.#sendFile(request.request, serveStaticResponse, async () => {
        try {
          await next()
          done()
        } catch (error) {
          done(error)
        }
      })
    })
  }
}
