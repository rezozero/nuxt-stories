import { joinURL } from 'ufo'
import { useState, useRuntimeConfig } from '#imports'

export function useStories() {
    const storiesUIVisible = useState('storiesUIVisible', () => true)
    const config = useRuntimeConfig()
    const { routeBasePath, frameBasePath } = (config.public.nuxtStories as { routeBasePath: string; frameBasePath: string }) ?? { routeBasePath: '/', frameBasePath: '/-frame' }

    /** Build the shell URL for a child route path (relative, e.g. 'v-button/default') */
    const storiesPath = (path: string) => joinURL(routeBasePath, path)

    /** Convert a shell URL to its frame counterpart */
    const frameUrl = (path: string) => joinURL(frameBasePath, path.slice(routeBasePath.length) || '/')

    return { storiesUIVisible, storiesPath, frameUrl }
}
