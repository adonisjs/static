/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'
import { stubsRoot } from './stubs/main.js'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  const codemods = await command.createCodemods()

  /**
   * Publish config to "config/static.ts" file
   */
  await codemods.makeUsingStub(stubsRoot, 'static/config.stub', {})

  /**
   * Register static middleware
   */
  await codemods.registerMiddleware('server', [
    {
      path: '@adonisjs/static/static_middleware',
    },
  ])

  /**
   * Register provider
   */
  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@adonisjs/static/static_provider')
    rcFile.addMetaFile('public/**', false)
  })
}
