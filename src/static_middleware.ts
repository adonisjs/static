/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type ServerResponse } from 'node:http'
import type { NextFn } from '@adonisjs/core/types/http'
import staticServer, { type RequestHandler } from 'serve-static'
import type { HttpContext, HttpResponse } from '@adonisjs/core/http'
import type { AssetsConfig } from './types.ts'

/**
 * Middleware to serve static assets from a pre-defined directory.
 *
 * This middleware integrates with the serve-static package to handle static file serving
 * in AdonisJS applications, with support for custom headers, caching, and other configuration options.
 *
 * @example
 * ```ts
 * const middleware = new StaticMiddleware('./public', {
 *   enabled: true,
 *   maxAge: '1d',
 *   etag: true
 * })
 * ```
 */
export default class StaticMiddleware {
  /**
   * Internal serve-static request handler with custom response type
   */
  #sendFile: RequestHandler<ServerResponse & { parent?: HttpResponse }>

  /**
   * Creates a new StaticMiddleware instance.
   *
   * Initializes the middleware with a serve-static handler configured to serve files
   * from the specified directory with the provided options. The middleware automatically
   * handles header propagation and custom header injection.
   *
   * @param publicPath - The absolute path to the directory containing static assets
   * @param config - Configuration options for static file serving
   *
   * @example
   * ```ts
   * const middleware = new StaticMiddleware('/path/to/public', {
   *   enabled: true,
   *   maxAge: 86400000,
   *   dotFiles: 'ignore'
   * })
   * ```
   */
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
   * Handle the HTTP request to serve static files.
   *
   * This method attempts to serve a static file from the configured directory.
   * If no matching file is found, it passes control to the next middleware in the chain.
   * The method ensures proper response handling by waiting for the file stream to complete
   * before resolving.
   *
   * @param context - The HTTP context containing request and response objects
   * @param next - The next function to call if no static file matches the request
   * @returns A promise that resolves when the static file has been served or the request has been passed to the next middleware
   *
   * @example
   * ```ts
   * // Usage within AdonisJS middleware pipeline
   * async handle(ctx, next) {
   *   await staticMiddleware.handle(ctx, next)
   * }
   * ```
   */
  async handle({ request, response }: HttpContext, next: NextFn): Promise<void> {
    const serveStaticResponse: ServerResponse & { parent?: HttpResponse } = response.response
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
