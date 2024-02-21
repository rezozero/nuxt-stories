import { joinURL } from 'ufo'
import { useState } from '#imports'

export function useStories() {
    const storiesUIVisible = useState('storiesUIVisible', () => true)
    const storiesPath = (path: string) => joinURL('/_stories', path)

    return { storiesUIVisible, storiesPath }
}
