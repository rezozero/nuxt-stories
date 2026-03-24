import {
    defineNuxtModule,
    createResolver,
    resolveFiles,
    addComponent,
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
    defaults: {},
    async setup(options, nuxt) {
        const resolver = createResolver(import.meta.url)
        const pattern = options.pattern || '**/*.stories.vue'
        const root = options.root || ['components', 'stories']
        const routeBasePath = joinURL('/', options.route?.path || '')
        const frameBasePath = routeBasePath === '/' ? '/-frame' : routeBasePath + '-frame'

        // Expose base paths so runtime composables can compute URLs dynamically
        nuxt.options.runtimeConfig.public.nuxtStories = {
            routeBasePath,
            frameBasePath,
        }

        // Child route arrays — shared by both shell and frame parents
        const shellChildren: NuxtPage[] = []
        const frameChildren: NuxtPage[] = []

        // Shell route: the full stories UI (nav + iframe + controls)
        const shellRoute: NuxtPage = {
            name: 'stories',
            file: resolver.resolve('./runtime/components/StoriesPage.vue'),
            ...options.route,
            meta: { layout: false },
            path: joinURL(routeBasePath, '/:story*'),
            children: shellChildren,
        }

        // Frame route: bare renderer used inside the iframe
        const frameRoute: NuxtPage = {
            name: 'stories-frame',
            file: resolver.resolve('./runtime/components/StoryFramePage.vue'),
            meta: { layout: false },
            path: joinURL(frameBasePath, '/:story*'),
            children: frameChildren,
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
                meta: { filePath },
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

        // IMPORTS
        addImportsDir(resolver.resolve('./runtime/composables'))

        // PAGES
        extendPages(async (pages) => {
            const storyPaths: string[] = []

            await Promise.all(
                nuxt.options._layers.map(async (layer) => {
                    const files = await resolveFiles(layer.config.rootDir, pattern)

                    files.flat().forEach((file) => {
                        const fileRoute = getFileRoute(file, layer.config.rootDir)
                        const name = withoutLeadingSlash(fileRoute.name as string)

                        // Shell children: same file, prefixed name (for nav enumeration)
                        shellChildren.push({ ...fileRoute, name: 'shell-' + name })
                        // Frame children: same file, prefixed name (for actual rendering)
                        frameChildren.push({ ...fileRoute, name: 'frame-' + name })

                        storyPaths.push(fileRoute.path as string)
                    })
                }),
            )

            pages.push(shellRoute, frameRoute)

            // Register all story paths for static generation (nuxi generate)
            nuxt.options.nitro.prerender ||= {}
            nuxt.options.nitro.prerender.routes = [
                ...(nuxt.options.nitro.prerender.routes as string[] ?? []),
                ...storyPaths.flatMap((p) => [joinURL(routeBasePath, p), joinURL(frameBasePath, p)]),
            ]
        })

        // WATCH (dev only)
        if (nuxt.options.dev) {
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
        }

        // NITRO CONFIG
        // nuxt.hook('nitro:config', async (nitroConfig) => {
        //     nitroConfig.publicAssets ||= []

        //     // Serve <rootDir>/stories/ at /stories/ (story images, etc.)
        //     nitroConfig.publicAssets.push({
        //         dir: 'stories',
        //         baseURL: 'stories',
        //         maxAge: 0,
        //     })

        //     // Serve the module's public assets (stories.css, etc.)
        //     nitroConfig.publicAssets.push({
        //         dir: resolver.resolve('./runtime/public'),
        //         maxAge: 60 * 60 * 24 * 365,
        //     })
        // })
    },
})
