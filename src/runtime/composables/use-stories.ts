import { useState } from '#imports'

export function useStories() {
    const storiesNavIsOpen = useState('storiesNavIsOpen', () => true)
    const toggleStoriesNav = () => (storiesNavIsOpen.value = !storiesNavIsOpen.value)

    return { storiesNavIsOpen, toggleStoriesNav }
}
