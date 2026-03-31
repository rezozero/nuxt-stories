import { joinURL, withoutTrailingSlash } from 'ufo'
import { useRuntimeConfig } from '#imports'

export function useStories() {
    const config = useRuntimeConfig()
    const { routeBasePath, frameBasePath, frameBaseUrl } = (config.public.nuxtStories as {
        routeBasePath: string
        frameBasePath: string
        frameBaseUrl: string | null
    }) ?? { routeBasePath: '/', frameBasePath: '/-frame', frameBaseUrl: null }

    // app.baseURL is e.g. '/nuxt-stories/' when deployed to a sub-path.
    // Iframe src attributes are resolved against the page origin (not the Nuxt router
    // base), so we must prepend the app base explicitly for same-origin frame URLs.
    const appBase = withoutTrailingSlash(config.app.baseURL ?? '')

    /** Build the shell URL for a child route path (relative, e.g. 'v-button/default') */
    const storiesPath = (path: string) => joinURL(routeBasePath, path)

    /** Convert a shell URL to its frame counterpart.
     *  When frameBaseUrl is set (2-process mode) the result is an absolute URL.
     *  Otherwise the result is an absolute path from the server root (includes appBase). */
    const frameUrl = (path: string) => {
        const routeRelative = path.startsWith(routeBasePath) ? path.slice(routeBasePath.length) : path
        const normalizedRelative = routeRelative.startsWith('/') ? routeRelative : `/${routeRelative}`
        const withoutFramePrefix =
            normalizedRelative === frameBasePath
                ? '/'
                : normalizedRelative.startsWith(`${frameBasePath}/`)
                  ? normalizedRelative.slice(frameBasePath.length)
                  : normalizedRelative
        const framePath = joinURL(frameBasePath, withoutFramePrefix || '/')
        if (frameBaseUrl) return frameBaseUrl + framePath
        // Prefix with appBase so the iframe src resolves to the correct server path
        return joinURL(appBase || '/', framePath)
    }

    return { storiesPath, frameUrl }
}
