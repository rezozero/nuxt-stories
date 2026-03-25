import { joinURL } from 'ufo'
import { useState, useRuntimeConfig } from '#imports'

export function useStories() {
    const storiesUIVisible = useState('storiesUIVisible', () => true)
    const config = useRuntimeConfig()
    const {
        routeBasePath,
        frameBasePath,
        frameBaseUrl,
    } = (config.public.nuxtStories as {
        routeBasePath: string
        frameBasePath: string
        frameBaseUrl: string | null
    }) ?? { routeBasePath: '/', frameBasePath: '/-frame', frameBaseUrl: null }

    /** Build the shell URL for a child route path (relative, e.g. 'v-button/default') */
    const storiesPath = (path: string) => joinURL(routeBasePath, path)

    /** Convert a shell URL to its frame counterpart.
     *  When frameBaseUrl is set (2-process mode) the result is an absolute URL. */
    const frameUrl = (path: string) => {
        const framePath = joinURL(frameBasePath, path.slice(routeBasePath.length) || '/')
        return frameBaseUrl ? frameBaseUrl + framePath : framePath
    }

    return { storiesUIVisible, storiesPath, frameUrl }
}
