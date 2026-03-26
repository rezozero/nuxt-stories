import path from 'path'
import fs from 'fs'
import { spawn, type ChildProcess } from 'child_process'

// Module-level guard: only one frame process at a time across Nuxt restarts
let _frameProcess: ChildProcess | null = null

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
    /**
     * (shell mode) Additional root directories to scan for story files.
     * Useful in 2-process mode where the frame extends only the app srcDir
     * but stories live in the shell's project root.
     */
    storyRoots?: string[]
    /**
     * Directory (relative to each layer root) whose contents are served as public assets.
     */
    publicAssetsDir?: string
    route?: NuxtPage
    root?: string | string[]
    pattern?: string | string[]
    enabled?: boolean
}

export default defineNuxtModule<NuxtStoriesOptions>({
    meta: {
        name: 'nuxt-stories',
        configKey: 'stories',
    },
    defaults: {
        enabled: true,
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
        if (!options.enabled) return

        const resolver = createResolver(import.meta.url)
        const pattern = options.pattern || '**/*.stories.vue'
        const root = options.root || ['components', 'stories']

        // Allow the spawned frame process (or CI) to override mode via env var
        const mode = (process.env.NUXT_STORIES_MODE as 'shell' | 'frame' | 'all' | undefined) || options.mode || 'all'

        // Always enable the pages module – the module adds routes via extendPages
        // regardless of whether an app/pages/ directory exists.
        nuxt.options.pages = true

        const routeBasePath = joinURL('/', options.route?.path || '')
        const frameBasePath = routeBasePath === '/' ? '/-frame' : routeBasePath + '-frame'

        // In a two-pass static build (GitHub Actions) the frame is generated with
        // NUXT_APP_BASE_URL=/base/-frame/ so the iframe-facing /-frame/* path is already
        // encoded in the base URL.  Routes must therefore live at / (not /-frame/*) so
        // that the generated files don't get an extra /-frame/ prefix that would make
        // them double-nested after the merge step.
        const staticFrameMode = mode === 'frame' && !nuxt.options.dev
        const effectiveFrameBasePath = staticFrameMode ? '/' : frameBasePath

        // In shell mode with a separate frame process the iframe points to the frame server URL.
        // When frameCwd is not set or in other modes the iframe uses same-origin routes.
        const frameBaseUrl = mode === 'shell' && nuxt.options.dev && options.frameCwd
            ? `http://localhost:${options.framePort ?? 3000}`
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

        // Frame mode: the app has no root page, so disable link-crawling and only
        // prerender the explicitly registered frame routes (avoids a 404 on '/').
        if (mode === 'frame') {
            nuxt.options.nitro.prerender ||= {}
            nuxt.options.nitro.prerender.crawlLinks = false
        }

        // In shell mode without frameCwd the frame runs same-origin, but the shell still
        // must not load the app's CSS — strip it here so it doesn't pollute the shell UI.
        // (When frameCwd is set, the CSS is stripped inside the spawn block below after
        //  being forwarded to the frame config.)
        if (mode === 'shell' && (!nuxt.options.dev || !options.frameCwd)) {
            nuxt.options.css = []
        }

        // SPAWN FRAME PROCESS (shell + dev mode only, when frameCwd is provided)
        // Instead of requiring the frame app to install the module, the shell generates
        // a temporary nuxt.config that extends the frame app and adds the module in frame mode.
        if (mode === 'shell' && nuxt.options.dev && options.frameCwd) {
            const frameAbsCwd = path.resolve(nuxt.options.rootDir, options.frameCwd)
            const frameTmpDir = path.join(frameAbsCwd, '.nuxt-stories')
            const frameTmpConfig = path.join(frameTmpDir, 'nuxt.config.mjs')
            const framePort = options.framePort ?? 3000
            // Use the actual running module file path (works in both stub and built mode)
            const moduleEntry = new URL(import.meta.url).pathname

            // Write a frame config that points srcDir directly at the app source dir.
            // Using srcDir+rootDir (not extends) avoids the Nuxt 4 double-'app' layer issue
            // and prevents the shell nuxt.config from being inherited by the frame.
            const frameSrcDir = path.resolve(frameAbsCwd, nuxt.options.srcDir.replace(nuxt.options.rootDir, '').replace(/^[\\/]/, '') || 'app')
            const srcDir = fs.existsSync(frameSrcDir) ? frameSrcDir : frameAbsCwd
            // Carry over CSS from the parent config so the frame renders with the same styles
            const cssEntries = nuxt.options.css.map((c: string) => JSON.stringify(c)).join(', ')

            // Remove app CSS from the shell to prevent style pollution — the frame will load it
            nuxt.options.css = []

            // Clear old .nuxt cache so the frame picks up the new config on restart
            const frameCacheDir = path.join(frameTmpDir, '.nuxt')
            if (fs.existsSync(frameCacheDir)) {
                fs.rmSync(frameCacheDir, { recursive: true, force: true })
            }

            fs.mkdirSync(frameTmpDir, { recursive: true })
            fs.writeFileSync(
                frameTmpConfig,
                [
                    `export default {`,
                    `  rootDir: ${JSON.stringify(frameAbsCwd)},`,
                    `  srcDir: ${JSON.stringify(srcDir)},`,
                    `  modules: [${JSON.stringify(moduleEntry)}],`,
                    `  pages: true,`,
                    `  stories: { mode: 'frame', storyRoots: [${JSON.stringify(frameAbsCwd)}] },`,
                    cssEntries ? `  css: [${cssEntries}],` : '',
                    `}`,
                ].filter(Boolean).join('\n'),
            )

            if (_frameProcess) {
                _frameProcess.kill()
                _frameProcess = null
            }

            console.log(`[nuxt-stories] Starting frame server in ${frameTmpDir} on port ${framePort}`)

            const nuxiBin = path.join(frameAbsCwd, 'node_modules', '.bin', 'nuxi')

            _frameProcess = spawn(
                nuxiBin,
                ['dev', frameTmpDir, '--port', String(framePort)],
                {
                    cwd: frameAbsCwd,
                    stdio: 'inherit',
                    shell: false,
                    env: { ...process.env },
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
        // layout: false — StoriesPage is a full-page component, no wrapper layout needed
        const shellRoute: NuxtPage = {
            name: 'stories',
            file: resolver.resolve('./runtime/components/StoriesPage.vue'),
            ...options.route,
            meta: { layout: false },
            path: joinURL(routeBasePath, '/:story*'),
            children: shellChildren,
        }

        // Frame route: bare renderer used inside the iframe
        // layout: false — StoryFramePage renders directly, app.vue only needs <NuxtPage />
        const frameRoute: NuxtPage = {
            name: 'stories-frame',
            file: resolver.resolve('./runtime/components/StoryFramePage.vue'),
            meta: { layout: false },
            path: joinURL(effectiveFrameBasePath, '/:story*'),
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

        // CSS — inject StoriesPage styles only in shell/all mode (not frame)
        if (mode !== 'frame') {
            nuxt.options.css.push(resolver.resolve('./runtime/assets/css/main.css'))
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
        // Shared story paths — populated in extendPages, consumed in nitro:config
        const storyPaths: string[] = []

        extendPages(async (pages) => {
            if (mode === 'shell') {
                pages.length = 0 // clear existing routes so only the shell route is registered at top level
            }

            // Collect unique root directories: app root + explicit storyRoots
            const allRoots = [nuxt.options.rootDir, ...(options.storyRoots || [])]

            await Promise.all(
                allRoots.map(async (rootDir) => {
                    console.log(`[nuxt-stories] Resolving stories in: ${rootDir}`)
                    const files = await resolveFiles(rootDir, pattern)

                    files.flat().forEach((file) => {
                        const fileRoute = getFileRoute(file, rootDir)
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
            // Register story paths for static generation (nuxi generate).
            // Done here (not inside extendPages) to guarantee the routes are visible
            // to Nitro — pages:extend is awaited before nitro:config fires.
            if (storyPaths.length > 0) {
                nitroConfig.prerender ||= {}
                nitroConfig.prerender.routes = [
                    ...(nitroConfig.prerender.routes ?? []),
                    ...(mode === 'shell' || mode === 'all'
                        ? storyPaths.map((p) => joinURL(routeBasePath, p))
                        : []),
                    ...(mode === 'frame' || mode === 'all'
                        ? storyPaths.map((p) => joinURL(effectiveFrameBasePath, p))
                        : []),
                ]
            }

            nitroConfig.publicAssets ||= []
            nitroConfig.publicAssets.push({
                dir: resolver.resolve('./runtime/public'),
                maxAge: 60 * 60 * 24 * 365,
            })

            // Expose stories assets directories as public assets
            const assetsSubDir = options.publicAssetsDir ?? 'stories/assets'
            const allRoots = [nuxt.options.rootDir, ...(options.storyRoots || [])]
            for (const rootDir of allRoots) {
                const publicAssetsDir = path.join(rootDir, assetsSubDir)

                if (fs.existsSync(publicAssetsDir)) {
                    nitroConfig.publicAssets.push({ dir: publicAssetsDir, baseURL: '/' + assetsSubDir, maxAge: 0 })
                }
            }
        })
    },
})
