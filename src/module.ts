import path from 'path'
import { spawn, type ChildProcess } from 'child_process'

// Module-level guard: only one frame process at a time across Nuxt restarts
let _frameProcess: ChildProcess | null = null
import {
    defineNuxtModule,
    createResolver,
    resolveFiles,
    addComponent,
    addImportsDir,
    addLayout,
    addPlugin,
    extendPages,
    resolveModule,
} from '@nuxt/kit' 
import type { NuxtPage } from '@nuxt/schema'
import { joinURL, withoutLeadingSlash, withoutTrailingSlash } from 'ufo'
import { minimatch } from 'minimatch'
import { pascalToKebabCase } from './runtime/utils/string/pascal-to-kebab-case'
import Aura from '@primeuix/themes/aura';

export interface NuxtStoriesOptions {
    /**
     * Process role:
     * - 'shell' — stories UI only (PrimeVue, nav, iframe); spawns the frame process automatically in dev
     * - 'frame' — component renderer only (user's app context); no PrimeVue, no shell UI
     * - 'all'   — single-process mode, backward-compatible default
     */
    mode?: 'shell' | 'frame' | 'all'
    /**
     * (shell mode) Absolute path to the frame app directory, used to spawn the frame dev server.
     * Relative paths are resolved from the shell app's root.
     */
    frameCwd?: string
    /**
     * (shell mode) Port for the frame dev server. Default: 3000.
     */
    framePort?: number
    route?: NuxtPage
    root?: string | string[]
    pattern?: string | string[]
}

export default defineNuxtModule<NuxtStoriesOptions>({
    meta: {
        name: 'nuxt-stories',
        configKey: 'stories',
    },
    defaults: {
        mode: 'all',
        framePort: 3000,
    },
    moduleDependencies: {
        '@primevue/nuxt-module': {
            version: '^4',
            defaults: {
                autoImport: false,
                // unstyled: true,
                components: {
                    prefix: 'pv',
                    include: ['Tree', 'Button', 'InputText', 'Splitter', 'SplitterPanel']
                },
                options: {
                    theme: {
                        preset: Aura
                    }
                }
            }
        },
    },
    async setup(options, nuxt) {
        const resolver = createResolver(import.meta.url)
        const pattern = options.pattern || '**/*.stories.vue'
        const root = options.root || ['components', 'stories']

        // Allow the spawned frame process to override mode via env var
        const mode = (process.env.NUXT_STORIES_MODE as NuxtStoriesOptions['mode']) || options.mode || 'all'

        const routeBasePath = joinURL('/', options.route?.path || '')
        const frameBasePath = routeBasePath === '/' ? '/-frame' : routeBasePath + '-frame'

        // In shell mode the iframe points to an absolute URL on the frame server
        const frameBaseUrl = mode === 'shell'
            ? options.frameCwd
                ? `http://localhost:${options.framePort ?? 3000}`
                : undefined
            : undefined

        // // Alias primevue to the module's own node_modules so runtime components
        // // can import from 'primevue/...' without requiring the consuming app to install it.
        // const primeVueDir = path.dirname(
        //     resolveModule('primevue/package.json', { paths: [resolver.resolve('.')] }),
        // )
        // nuxt.options.alias['primevue'] = primeVueDir

        // // Register the PrimeVue shell plugin (unstyled, no CSS contamination)
        // addPlugin(resolver.resolve('./runtime/plugins/primevue'))

        // Expose base paths so runtime composables can compute URLs dynamically
        nuxt.options.runtimeConfig.public.nuxtStories = {
            routeBasePath,
            frameBasePath,
            frameBaseUrl: frameBaseUrl ?? null,
        } as { routeBasePath: string; frameBasePath: string; frameBaseUrl: string | null }

        // SPAWN FRAME PROCESS (shell + dev mode only)
        if (mode === 'shell' && nuxt.options.dev && options.frameCwd) {
            const frameAbsCwd = path.resolve(nuxt.options.rootDir, options.frameCwd)
            const framePort = options.framePort ?? 3000

            // Kill any leftover frame process from a previous Nuxt restart
            if (_frameProcess) {
                _frameProcess.kill()
                _frameProcess = null
            }

            console.log(`[nuxt-stories] Starting frame server in ${frameAbsCwd} on port ${framePort}`)

            // Resolve the nuxi binary from the frame app's node_modules so we
            // don't depend on a globally-installed nuxi / npx availability.
            const nuxiBin = path.join(frameAbsCwd, 'node_modules', '.bin', 'nuxi')

            _frameProcess = spawn(
                nuxiBin,
                ['dev', '--port', String(framePort)],
                {
                    cwd: frameAbsCwd,
                    stdio: 'inherit',
                    shell: false,
                    env: {
                        ...process.env,
                        NUXT_STORIES_MODE: 'frame',
                    },
                },
            )

            _frameProcess.on('error', (err) => {
                console.error('[nuxt-stories] Frame process error:', err)
            })

            _frameProcess.on('close', () => {
                _frameProcess = null
            })

            nuxt.hook('close', () => {
                _frameProcess?.kill()
                _frameProcess = null
            })
        }

        // Child route arrays — shared by both shell and frame parents
        const shellChildren: NuxtPage[] = []
        const frameChildren: NuxtPage[] = []

        // Shell route: the full stories UI (nav + iframe + controls)
        const shellRoute: NuxtPage = {
            name: 'stories',
            file: resolver.resolve('./runtime/components/StoriesPage.vue'),
            ...options.route,
            meta: { layout: 'default' },
            path: joinURL(routeBasePath, '/:story*'),
            children: shellChildren,
        }

        // Frame route: bare renderer used inside the iframe
        const frameRoute: NuxtPage = {
            name: 'stories-frame',
            file: resolver.resolve('./runtime/components/StoryFramePage.vue'),
            meta: { layout: 'story' },
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

        // NUXT UI — resolve from the module's own node_modules so the consuming app
        // doesn't need to install @nuxt/ui itself
        // await installModule(resolveModule('@nuxt/ui', { paths: resolver.resolve('.') }))

        // LAYOUTS
        // Shell needs 'default' layout; frame needs 'story' layout; 'all' needs both
        if (mode === 'shell' || mode === 'all') {
            addLayout(resolver.resolve('./runtime/layouts/default.vue'), 'default')
        }
        if (mode === 'frame' || mode === 'all') {
            addLayout(resolver.resolve('./runtime/layouts/story.vue'), 'story')
        }

        // COMPONENTS
        // NuxtStory / NuxtStoryVariant are only needed inside the frame
        if (mode === 'frame' || mode === 'all') {
            await addComponent({
                name: 'NuxtStory',
                filePath: resolver.resolve('./runtime/components/NuxtStory.vue'),
            })

            await addComponent({
                name: 'NuxtStoryVariant',
                filePath: resolver.resolve('./runtime/components/NuxtStoryVariant.vue'),
            })
        }

        // IMPORTS
        addImportsDir(resolver.resolve('./runtime/composables'))

        // PAGES
        // Shell mode: only registers shell routes (reads story file paths for nav but renders via iframe)
        // Frame mode: only registers frame routes (renders actual story components)
        // All mode: both (single-process, backward-compatible)
        extendPages(async (pages) => {
            const storyPaths: string[] = []

            await Promise.all(
                nuxt.options._layers.map(async (layer) => {
                    console.log(`[nuxt-stories] Resolving stories in layer: ${layer.config.rootDir}`)
                    const files = await resolveFiles(layer.config.rootDir, pattern)

                    files.flat().forEach((file) => {
                        const fileRoute = getFileRoute(file, layer.config.rootDir)
                        const name = withoutLeadingSlash(fileRoute.name as string)

                        if (mode === 'shell' || mode === 'all') {
                            shellChildren.push({ ...fileRoute, name: 'shell-' + name })
                        }
                        if (mode === 'frame' || mode === 'all') {
                            frameChildren.push({ ...fileRoute, name: 'frame-' + name })
                        }

                        storyPaths.push(fileRoute.path as string)
                    })
                }),
            )

            if (mode === 'shell' || mode === 'all') pages.push(shellRoute)
            if (mode === 'frame' || mode === 'all') pages.push(frameRoute)

            // Register all story paths for static generation (nuxi generate)
            nuxt.options.nitro.prerender ||= {}
            nuxt.options.nitro.prerender.routes = [
                ...(nuxt.options.nitro.prerender.routes as string[] ?? []),
                ...(mode === 'shell' || mode === 'all'
                    ? storyPaths.map((p) => joinURL(routeBasePath, p))
                    : []),
                ...(mode === 'frame' || mode === 'all'
                    ? storyPaths.map((p) => joinURL(frameBasePath, p))
                    : []),
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

        // NITRO CONFIG — serve the module's static public assets (stories.css, etc.)
        nuxt.hook('nitro:config', (nitroConfig) => {
            nitroConfig.publicAssets ||= []
            nitroConfig.publicAssets.push({
                dir: resolver.resolve('./runtime/public'),
                maxAge: 60 * 60 * 24 * 365,
            })
        })
    },
})
