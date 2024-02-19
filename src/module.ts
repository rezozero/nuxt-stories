import {defineNuxtModule, addPlugin, createResolver, resolveFiles} from '@nuxt/kit'
import type {NuxtPage} from "@nuxt/schema";
import {joinURL, withoutTrailingSlash} from "ufo";
import minimatch from "minimatch"
import {pascalToKebabCase} from "./runtime/utils/string/pascal-to-kebab-case"

// Module options TypeScript interface definition
export interface NuxtStoriesOptions {
  route?: NuxtPage
  include?: string
  root?: string[]
}

export default defineNuxtModule<NuxtStoriesOptions>({
  meta: {
    name: 'nuxt-stories',
    configKey: 'stories',
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup (options, nuxt) {
    if (process.env.NUXT_STORIES !== '1') return

    const resolver = createResolver(import.meta.url)

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))

    const route = options?.route

    if (!route) return

    const include = options.include || '**/*.stories.vue'
    const root = options.root || []
    const getFileRoute = (file: string): NuxtPage => {
      const filePath = withoutTrailingSlash(
        file
          .replace(nuxt.options.rootDir, '')
          .split('/')
          .filter((pathPart) => !root.includes(pathPart))
          .join('/')
          .split('.')[0],
      )
      const routePath = pascalToKebabCase(filePath)

      return {
        name: routePath,
        path: routePath,
        meta: {
          filePath,
        },
        file,
      }
    }

    nuxt.hook('components:dirs', (dirs) => {
      dirs.push({
        path: resolver.resolve('./runtime/components'),
        pathPrefix: false,
      })
    })

    nuxt.hook('imports:dirs', (dirs) => {
      dirs.push(resolver.resolve('./runtime/composables'))
    })

    nuxt.hook('pages:extend', async (pages) => {
      const files = await resolveFiles(nuxt.options.rootDir, include)

      route.children = route.children || []

      files.forEach((file) => {
        const fileRoute = getFileRoute(file)

        route.children!.push(fileRoute)
      })

      pages.push({
        ...route,
        path: joinURL(route.path, '/:story*'),
      })
    })

    nuxt.hook('builder:watch', (event, path) => {
      if (!minimatch(path, include)) return

      if (event === 'add' || event === 'unlink') {
        nuxt.callHook('restart')
      }
    })
  }
})
