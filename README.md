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

## Options

### `route`
- type: `{ name?: string; file?: string; path?: string; }`
- default: 
```
{ 
    name: 'stories', 
    file: './runtime/components/StoriesPage.vue', 
    path: '/_stories' 
}
```

### `root`
- type: `string | string[]`
- default: `'**/*.stories.vue'`

### `pattern`
- type: `string | string[]`
- default: `['components', 'stories']`

## Assets

You can add assets to your stories by adding a `stories` folder in the `/server` directory.  
All the assets in this folder will be available as public assets with the prefix `/stories`.  
You can use it like the `/public` folder in the Nuxt app, but the folder will be available only when the stories are available too.

## Mocking requests

Stories can mock network requests with [MSW](https://mswjs.io) (Mock Service Worker v2).

### Installation

`msw` is an optional peer dependency: install it in the project that renders the stories.

```bash
pnpm add -D msw
```

Nothing else is needed: the module serves `mockServiceWorker.js` itself (no `msw init`), at the app base URL so the
worker controls the story frame. Without `msw`, nothing is registered nor loaded.

### Usage

Call the auto-imported `useMockRequest()` in a story with one or more MSW handlers:

```vue
<script lang="ts" setup>
import { delay, http, HttpResponse } from 'msw'

const props = defineProps({ loadingDelay: { type: Number, default: 0 } })

useMockRequest(
    http.get('*/items', async ({ request }) => {
        await delay(props.loadingDelay)
        return HttpResponse.json({ 'hydra:member': [], 'hydra:totalItems': 0 })
    }),
)
</script>
```

- The worker is started once, before the app mounts, so the first requests of a story are already mocked.
- Handlers are active while the story is mounted and removed when it unmounts (story change, hot reload).
- Resolvers run on each request: reactive values read inside them (props, `useStoryControls()`) are up to date.
- Unmatched requests go to the network (`onUnhandledRequest: 'bypass'`).

See `playground/stories/app/components/VPaginatedList/Default.stories.vue`: it mocks the requests of the `VPaginatedList` component, with a configurable delay.

### Server-side rendering

Requests made during SSR are mocked too, with `msw/node` in the server process. Data fetched on the server reaches
the client through the payload; the browser worker handles the following requests.

- Handlers are scoped to the render that registered them: concurrent renders never share mocks. For this, the module
  forces Nuxt `experimental.asyncContext` on in the app that renders the stories.
- Requests that lose the Nuxt async context (detached timers, some third-party SDKs) are not mocked.
- Handlers are released with the render's Nuxt app, so requests still in flight after the HTML is sent stay mocked.
- **Only absolute URLs are mocked on the server.** Nuxt serves relative calls such as `$fetch('/api/…')` from Nitro
  directly, without a network request, so MSW never sees them.
- In shell mode the frame inherits the shell's `ssr` option. Set `stories.frameSsr: true` to render stories on the
  server anyway.

See `playground/stories/app/components/mock/ServerRendered.stories.vue`.

### Limits

- Client only: requests made on the server (SSR, Nitro routes) are not mocked. Stories are meant to run with `ssr: false`.
- Service workers need a secure context (`localhost` or HTTPS). The frame is cross-origin in dev (shell and frame use
  different ports): browsers that block third-party service workers in iframes (e.g. strict privacy settings) will not
  mock requests; the story still renders, with a warning in the console.
- Once `msw` is installed, the worker starts in every story frame, even for stories without mocks.
- Set `stories.mock: false` to disable mocking even when `msw` is installed.

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
