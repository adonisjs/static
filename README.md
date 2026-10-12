# @adonisjs/static

<br />

[![gh-workflow-image]][gh-workflow-url] [![npm-image]][npm-url] ![][typescript-image] [![license-image]][license-url]

## Introduction

Middleware to serve static files from a given directory of your AdonisJS apps

## Official Documentation

The documentation is available on the [AdonisJS website](https://docs.adonisjs.com/guides/static-file-server)

## Limiting lookups to URL prefixes

By default, the middleware looks for a file in `public/` on every request, including the requests your routes handle. Define `prefixes` in `config/static.ts` to limit the lookup to some URL paths:

```ts
import { defineConfig } from '@adonisjs/static'

export default defineConfig({
  prefixes: ['/assets', '/favicon.ico', '/robots.txt'],
})
```

A request matches when its path equals a prefix or is nested under it. `/assets/app.js` matches `/assets`, and `/assets-old/app.js` does not. All other requests go to the next middleware without a filesystem lookup.

The prefixes do not change the file path. `/assets/app.js` still serves `public/assets/app.js`.

A file in `public/` with no matching prefix is not served. The middleware compares the prefixes as-is with the request URL, so it does not decode the path or ignore the case.

## Contributing

One of the primary goals of AdonisJS is to have a vibrant community of users and contributors who believes in the principles of the framework.

We encourage you to read the [contribution guide](https://github.com/adonisjs/.github/blob/main/docs/CONTRIBUTING.md) before contributing to the framework.

## Code of Conduct

In order to ensure that the AdonisJS community is welcoming to all, please review and abide by the [Code of Conduct](https://github.com/adonisjs/.github/blob/main/docs/CODE_OF_CONDUCT.md).

## License

AdonisJS static files middleware is open-sourced software licensed under the [MIT license](LICENSE.md).

[gh-workflow-image]: https://img.shields.io/github/actions/workflow/status/adonisjs/static/checks.yml?style=for-the-badge
[gh-workflow-url]: https://github.com/adonisjs/static/actions/workflows/checks.yml 'Github action'
[npm-image]: https://img.shields.io/npm/v/@adonisjs/static/latest.svg?style=for-the-badge&logo=npm
[npm-url]: https://www.npmjs.com/package/@adonisjs/static/v/latest 'npm'
[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[license-url]: LICENSE.md
[license-image]: https://img.shields.io/github/license/adonisjs/static?style=for-the-badge
