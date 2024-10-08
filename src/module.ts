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
import { joinURL, withoutLeadingSlash, withoutTrailingSlash } from 'ufo'
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
        const routeBasePath = joinURL('/', options.route?.path || '_stories')
        const route: NuxtPage = {
            name: 'stories',
            file: resolver.resolve('./runtime/components/StoriesPage.vue'),
            ...options.route,
            meta: {
                layout: 'stories',
            },
            path: joinURL(routeBasePath, '/:story*'),
            children: [] as NuxtPage[],
        }

        const getFileRoute = (file: string, rootDir: string): NuxtPage => {
            const filePath = withoutTrailingSlash(
                file
                    .replace(rootDir, '')
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

        // COMPONENTS
        await addComponent({
            name: 'NuxtStory',
            filePath: resolver.resolve('./runtime/components/NuxtStory.vue'),
        })

        await addComponent({
            name: 'NuxtStoryVariant',
            filePath: resolver.resolve('./runtime/components/NuxtStoryVariant.vue'),
        })

        // LAYOUTS
        addLayout(resolver.resolve('./runtime/layouts/stories.vue'), 'stories')

        // IMPORTS
        addImportsDir(resolver.resolve('./runtime/composables'))

        // PAGES
        extendPages(async (pages) => {
            // generate child routes
            await Promise.all(
                nuxt.options._layers.map(async (layer) => {
                    const files = await resolveFiles(layer.config.rootDir, pattern)

                    files.flat().forEach((file) => {
                        const fileRoute = getFileRoute(file, layer.config.rootDir)

                        route.children!.push(fileRoute)
                    })
                }),
            )

            // add route
            pages.push(route)
        })

        // WATCH
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

        // NITRO CONFIG
        nuxt.hook('nitro:config', async (nitroConfig) => {
            nitroConfig.publicAssets ||= []

            // If stories directory exists, add it to public assets
            nitroConfig.publicAssets.push({
                dir: 'stories',
                baseURL: 'stories',
                maxAge: 0,
            })

            // Add runtime directory
            nitroConfig.publicAssets.push({
                dir: resolver.resolve('./runtime/public'),
                maxAge: 60 * 60 * 24 * 365, // 1 year
            })
        })
    },
})
