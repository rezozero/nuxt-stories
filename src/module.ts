import path from 'path'
import {
    defineNuxtModule,
    createResolver,
    resolveFiles,
    addComponent,
    addLayout,
    addImportsDir,
    extendPages,
} from '@nuxt/kit'
import type { NuxtPage } from '@nuxt/schema'
import { withoutLeadingSlash, withoutTrailingSlash } from 'ufo'
import { minimatch } from 'minimatch'
import { pascalToKebabCase } from './runtime/utils/string/pascal-to-kebab-case'

export interface NuxtStoriesOptions {
    route?: NuxtPage
    root?: string | string[]
    pattern?: string | string[]
}

export default defineNuxtModule<NuxtStoriesOptions>({
    meta: {
        name: 'nuxt-stories',
        configKey: 'stories',
    },
    // Default configuration options of the Nuxt module
    defaults: {},
    async setup(options, nuxt) {
        if (!nuxt.options.dev && !nuxt.options._prepare && process.env.NUXT_STORIES !== '1') return

        const resolver = createResolver(import.meta.url)
        const pattern = options.pattern || '**/*.stories.vue'
        const root = options.root || ['components', 'stories']
        const routeBasePath = path.join('/', options.route?.path || '_stories')
        const route: NuxtPage = {
            name: 'stories',
            file: resolver.resolve('./runtime/components/StoriesPage.vue'),
            ...options.route,
            path: path.join(routeBasePath, '/:story*'),
            children: [] as NuxtPage[],
        }

        const getFileRoute = (file: string): NuxtPage => {
            const filePath = withoutTrailingSlash(
                file
                    .replace(nuxt.options.rootDir, '')
                    .split('/')
                    .filter((pathFragment) => !root.includes(pathFragment))
                    .join('/')
                    .split('.')[0],
            )
            const routePath = pascalToKebabCase(filePath)

            return {
                name: routePath,
                path: withoutLeadingSlash(routePath),
                meta: {
                    filePath,
                },
                file,
            }
        }

        await addComponent({
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
            if (
                typeof pattern === 'string'
                    ? !minimatch(path, pattern)
                    : !pattern.some((patternValue) => minimatch(path, patternValue))
            )
                return

            if (event === 'add' || event === 'unlink') {
                nuxt.callHook('restart')
            }
        })
    },
})
