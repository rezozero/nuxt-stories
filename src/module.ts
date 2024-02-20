import {
  defineNuxtModule,
  createResolver,
  resolveFiles,
  addComponent,
  addLayout,
  addImportsDir, extendPages, addPlugin
} from '@nuxt/kit'
import type {NuxtPage} from "@nuxt/schema";
import {withoutTrailingSlash} from "ufo";
import minimatch from "minimatch"
import {pascalToKebabCase} from "./runtime/utils/string/pascal-to-kebab-case"
import path from "path";

export interface NuxtStoriesOptions {
  route?: NuxtPage
  include?: string | string[]
  pattern?: string | string[]
}

export default defineNuxtModule<NuxtStoriesOptions>({
  meta: {
    name: 'nuxt-stories',
    configKey: 'stories',
  },
  // Default configuration options of the Nuxt module
  defaults: {},
  setup (options, nuxt) {
    if (!nuxt.options.dev && !nuxt.options._prepare && process.env.NUXT_STORIES !== '1') return

    const resolver = createResolver(import.meta.url)
    const pattern = options.pattern || '**/*.stories.vue'
    const include = options.include || []
    const route: NuxtPage = {
      name: 'stories',
      file: resolver.resolve('./runtime/components/StoriesPage.vue'),
      ...options.route,
      path: path.join('/', options.route?.path || '_stories', '/:story*'),
      children: [] as NuxtPage[],
    }

    const getFileRoute = (file: string): NuxtPage => {
      const filePath = withoutTrailingSlash(
        file
          .replace(nuxt.options.rootDir, '')
          .split('/')
          .filter((pathFragment) => !include.includes(pathFragment))
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

    // do not add the extension, it will be handled during the build
    addPlugin(resolver.resolve('./runtime/plugin'))

    addComponent({
      name: 'NuxtStory',
      filePath: resolver.resolve('./runtime/components/NuxtStory.vue'),
    })

    addLayout(resolver.resolve('./runtime/layouts/stories.vue'), 'stories')

    addImportsDir(resolver.resolve('./runtime/composables'))


    extendPages(async (pages) => {
      const files = await resolveFiles(nuxt.options.rootDir, pattern)

      files.forEach((file) => {
        const fileRoute = getFileRoute(file)

        route.children!.push(fileRoute)
      })

      pages.push(route)
    })

    nuxt.hook('builder:watch', (event, path) => {
      if (!minimatch(path, pattern)) return

      if (event === 'add' || event === 'unlink') {
        nuxt.callHook('restart')
      }
    })
  }
})
