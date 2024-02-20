import { useState } from '#imports'
import { joinURL } from 'ufo'

export function useStories() {
    const storiesNavIsOpen = useState('storiesNavIsOpen', () => true)
    const toggleStoriesNav = () => (storiesNavIsOpen.value = !storiesNavIsOpen.value)
    const storiesPath = (path: string) => joinURL('/_stories', path)

    return { storiesNavIsOpen, toggleStoriesNav, storiesPath }
}
