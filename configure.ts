/*
 * @adonisjs/static
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  await command.publishStub('static/config.stub')

  const codemods = await command.createCodemods()

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
  })
}
