# Nuxt stories

[![npm version][npm-version-src]][npm-version-href]
[![Nuxt][nuxt-src]][nuxt-href]

Nuxt stories module - a kind of ultra light Storybook

- [✨ &nbsp;Release Notes](/CHANGELOG.md)

## Features

- 👯‍♀️ &nbsp;Share the same configuration between the app and the stories
- 💆‍♂️ &nbsp;No configuration needed
- 🚀 &nbsp;Fast - no extra build step during development

## Quick Setup

1. Add `@rezo-zero/nuxt-stories` dependency to your project

```bash
# Using pnpm
pnpm add -D @rezo-zero/nuxt-stories

# Using yarn
yarn add --dev @rezo-zero/nuxt-stories

# Using npm
npm install --save-dev @rezo-zero/nuxt-stories
```

2. Add ` @rezo-zero/nuxt-stories` to the `modules` section of `nuxt.config.ts`

```js
export default defineNuxtConfig({
  modules: [
    '@rezo-zero/nuxt-stories'
  ]
})
```

That's it! You can now use Nuxt stories in your Nuxt app ✨

## Development

```bash
# Install dependencies
npm install

# Generate type stubs
npm run dev:prepare

# Develop with the playground
npm run dev

# Build the playground
npm run dev:build

# Run ESLint
npm run lint

# Run Vitest
npm run test
npm run test:watch

# Release new version
npm run release
```

## Caveats

The app must use Nuxt layout.  
Behind the scene, this module will use a layout `stories` (automatically injected) to display the stories.  
At least, the app must have a `default` layout. That is how the layout can be switched by the module.

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@rezo-zero/nuxt-stories/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@rezo-zero/nuxt-stories

[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
