import path from 'path'
import fs from 'fs'
import { spawn, type ChildProcess } from 'child_process'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import { defineNuxtModule, createResolver, resolveFiles, addComponent, addImportsDir, extendPages } from '@nuxt/kit'
import type { NuxtPage, ModuleDependencies, NuxtModule } from '@nuxt/schema'
import { joinURL, withoutLeadingSlash, withoutTrailingSlash } from 'ufo'
import { minimatch } from 'minimatch'
import { pascalToKebabCase } from './runtime/utils/string/pascal-to-kebab-case'
import Aura from '@primeuix/themes/aura'

// Module-level guard: only one frame process at a time across Nuxt restarts
let _frameProcess: ChildProcess | null = null

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

const _module: NuxtModule<NuxtStoriesOptions> = defineNuxtModule<NuxtStoriesOptions>({
    meta: {
        name: 'nuxt-stories',
        configKey: 'stories',
    },
    defaults: {
        enabled: true,
        mode: 'all',
        framePort: 3000,
    },
    moduleDependencies(nuxt): ModuleDependencies {
        const mode =
            (process.env.NUXT_STORIES_MODE as string | undefined) ||
            (nuxt.options as unknown as { stories?: { mode?: string } }).stories?.mode ||
            'all'

        if (mode === 'frame') return {}

        // Resolve @primevue/nuxt-module from nuxt-stories' own node_modules so the
        // consuming app doesn't need to install it. Using an absolute path as the key
        // bypasses pnpm's strict isolation while still going through moduleDependencies.
        // import.meta.resolve follows ESM exports and returns the .mjs entry point.
        let primevuePath: string
        try {
            primevuePath = fileURLToPath(import.meta.resolve('@primevue/nuxt-module'))
        } catch {
            return {}
        }

        return {
            [primevuePath]: {
                defaults: {
                    autoImport: false,
                    components: {
                        prefix: 'pv',
                        include: ['Tree', 'Button', 'InputText', 'Splitter', 'SplitterPanel', 'Toolbar', 'Menu'],
                    },
                    options: {
                        theme: {
                            preset: Aura,
                        },
                    },
                },
            },
        }
    },
    async setup(options, nuxt) {
        if (!options.enabled) return

        const resolver = createResolver(import.meta.url)
        const pattern = options.pattern || '**/*.stories.vue'
        const root = options.root || ['app', 'components', 'stories']

        // Allow the spawned frame process (or CI) to override mode via env var
        const mode = (process.env.NUXT_STORIES_MODE as 'shell' | 'frame' | 'all' | undefined) || options.mode || 'all'

        // @primevue/nuxt-module generates code that imports from 'primevue', '@primeuix/themes', etc.
        // Those packages live in nuxt-stories' own node_modules, not the consumer's.
        // • alias        → Vite client/SSR: virtual modules (virtual:#primevue-style) resolve
        //                  subpath imports (primevue/button/style) via explicit directory mapping
        // • modulesDir   → Vite bare-import fallback
        // • nitro.nodeModulesDirs → Nitro server bundle + Node.js dev runtime resolution
        let storiesNodeModules: string | null = null
        if (mode !== 'frame') {
            try {
                const _require = createRequire(import.meta.url)
                const primevueDir = path.dirname(_require.resolve('primevue/package.json'))
                storiesNodeModules = path.dirname(primevueDir)
                // Alias so Vite resolves primevue/* subpath imports from the virtual module context
                nuxt.options.alias['primevue'] = primevueDir
                if (!nuxt.options.modulesDir.includes(storiesNodeModules)) {
                    nuxt.options.modulesDir.push(storiesNodeModules)
                }
            } catch {
                // ignore
            }
        }

        // Always enable the pages module – the module adds routes via extendPages
        // regardless of whether an app/pages/ directory exists.
        nuxt.options.pages = true

        const routeBasePath = joinURL('/', options.route?.path || '')
        // NUXT_STORIES_FRAME_BASE_PATH lets the CI build override where the frame lives.
        // In the two-pass GitHub Actions workflow the shell is built with e.g.
        //   NUXT_STORIES_FRAME_BASE_PATH=/nuxt-stories-frame
        // so its iframes point to /nuxt-stories/nuxt-stories-frame/…, while the frame is
        // built with NUXT_APP_BASE_URL=/nuxt-stories/nuxt-stories-frame/ and its output is
        // merged into the artifact under nuxt-stories-frame/.  This gives the frame its own
        // _nuxt/ bundle (no asset collision) and a dedicated URL namespace that is clearly
        // distinct from the shell's /:story* catch-all routes.
        const frameBasePath =
            process.env.NUXT_STORIES_FRAME_BASE_PATH || (routeBasePath === '/' ? '/-frame' : routeBasePath + '-frame')

        // In a two-pass static build (GitHub Actions) the frame is generated with
        // NUXT_APP_BASE_URL=/nuxt-stories/<frame-base>/ so that base path is already
        // encoded in the app base URL.  Routes must therefore live at / (not at the
        // frame base path) so that the generated files land directly in .output/public/
        // and do not get double-prefixed after the merge step.
        const staticFrameMode = mode === 'frame' && !nuxt.options.dev
        const effectiveFrameBasePath = staticFrameMode ? '/' : frameBasePath

        // In shell mode with a separate frame process the iframe points to the frame server URL.
        // When frameCwd is not set or in other modes the iframe uses same-origin routes.
        const frameBaseUrl =
            mode === 'shell' && nuxt.options.dev && options.frameCwd
                ? `http://localhost:${options.framePort ?? 3000}`
                : undefined

        // Expose base paths so runtime composables can compute URLs dynamically
        nuxt.options.runtimeConfig.public.nuxtStories = {
            routeBasePath,
            frameBasePath,
            frameBaseUrl: frameBaseUrl ?? null,
        } as { routeBasePath: string; frameBasePath: string; frameBaseUrl: string | null }

        // Disable link-crawling for both frame and shell static builds.
        // Frame: avoids a 404 on '/' when no root page exists.
        // Shell: StoriesPage is SSR'd with <iframe :src="iframeSrc">, whose computed value
        //   contains frame URLs.  If crawlLinks is true, Nitro follows those links and
        //   renders them with the shell router (/:story* catches everything), writing shell
        //   HTML into the frame subtree and clobbering the real frame output after merge.
        // Explicit prerender routes (storyPaths) cover all required pages for both modes.
        if (mode === 'frame' || (mode === 'shell' && !nuxt.options.dev)) {
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

            // The generated config lives in frameTmpDir (.nuxt-stories/) and extends the frame
            // app directory. Using extends (not srcDir+rootDir pointing at frameAbsCwd) lets
            // all layers declared in the frame app's nuxt.config cascade automatically —
            // components, composables, aliases, CSS, modules, etc. are all inherited.
            //
            // Shell config is NOT pulled in: the dependency is one-way (shell extends frame app),
            // so extending frameAbsCwd never reaches the shell's nuxt.config.
            //
            // The Nuxt 4 double-'app' issue is avoided because rootDir (frameTmpDir) ≠ extends
            // target (frameAbsCwd), so Nuxt resolves srcDir for each layer independently.

            // Collect public dirs from shell-only layers so @nuxt/image IPX can find story assets.
            // Frame app layers are covered by extends; only shell-exclusive layers need explicit forwarding.
            const framePublicDir = path.join(frameAbsCwd, 'public')
            const shellLayerPublicDirs = (nuxt.options._layers as unknown as Array<{ config: { rootDir?: string } }>)
                .map((layer) => path.join(layer.config.rootDir ?? frameAbsCwd, 'public'))
                .filter((dir) => dir !== framePublicDir && fs.existsSync(dir))
            const imageExtraDirsEntry =
                shellLayerPublicDirs.length > 0
                    ? shellLayerPublicDirs.map((dir) => JSON.stringify(dir)).join(', ')
                    : null

            // Remove app CSS from the shell to prevent style pollution — inherited by the frame via extends
            nuxt.options.css = []

            // Keys from the shell's nuxt config that must NOT be forwarded to the frame.
            // Everything else is inherited so that top-level options like `ssr`, `experimental`,
            // `app`, `vite`, etc. propagate automatically.
            const FRAME_EXCLUDED_CONFIG_KEYS = new Set([
                // Frame-incompatible or explicitly overridden below
                'moduleDependencies',
                'modules',
                'css',
                'extends',
                'theme',
                'rootDir',
                'srcDir',
                'buildDir',
                'workspaceDir',
                'stories',
                'pages',
                'nitro',
                // Nuxt internals
                '_layers',
                '_installedModules',
                '_modules',
                '_ignore',
            ])

            // Read the shell app's raw user config (first layer = the shell's own nuxt.config).
            // This gives us user-defined values before Nuxt merges in its defaults.
            const shellRawConfig = ((nuxt.options._layers as unknown as Array<{ config: Record<string, unknown> }>)[0]
                ?.config ?? {}) as Record<string, unknown>

            const frameInheritedLines = Object.entries(shellRawConfig)
                .filter(([key]) => !FRAME_EXCLUDED_CONFIG_KEYS.has(key))
                .flatMap(([key, value]) => {
                    try {
                        return [`  ${key}: ${JSON.stringify(value)},`]
                    } catch {
                        // Skip values that are not JSON-serializable (functions, class instances, etc.)
                        return []
                    }
                })

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
                    // Inherited shell options first — explicit entries below override them
                    ...frameInheritedLines,
                    `  rootDir: ${JSON.stringify(frameTmpDir)},`,
                    `  extends: [${JSON.stringify(frameAbsCwd)}],`,
                    `  modules: [${JSON.stringify(moduleEntry)}],`,
                    `  pages: true,`,
                    `  stories: { mode: 'frame', storyRoots: [${JSON.stringify(frameAbsCwd)}] },`,
                    imageExtraDirsEntry ? `  image: { dirs: [${imageExtraDirsEntry}] },` : '',
                    `}`,
                ]
                    .filter(Boolean)
                    .join('\n'),
            )

            if (_frameProcess) {
                _frameProcess.kill()
                _frameProcess = null
            }

            console.log(`[nuxt-stories] Starting frame server in ${frameTmpDir} on port ${framePort}`)

            const nuxiBin = path.join(frameAbsCwd, 'node_modules', '.bin', 'nuxi')

            _frameProcess = spawn(nuxiBin, ['dev', frameTmpDir, '--port', String(framePort)], {
                cwd: frameAbsCwd,
                stdio: 'inherit',
                shell: false,
                env: { ...process.env },
            })

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
            // Expose nuxt-stories' node_modules to Nitro so primevue and related
            // packages can be resolved in the server bundle and at Node.js dev runtime.
            if (storiesNodeModules) {
                nitroConfig.nodeModulesDirs = [...(nitroConfig.nodeModulesDirs || []), storiesNodeModules]
            }

            // Register story paths for static generation (nuxi generate).
            // Done here (not inside extendPages) to guarantee the routes are visible
            // to Nitro — pages:extend is awaited before nitro:config fires.
            if (storyPaths.length > 0) {
                nitroConfig.prerender ||= {}
                nitroConfig.prerender.routes = [
                    ...(nitroConfig.prerender.routes ?? []),
                    ...(mode === 'shell' || mode === 'all' ? storyPaths.map((p) => joinURL(routeBasePath, p)) : []),
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

export default _module
