export function pascalToKebabCase(value: string) {
    return value
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2') // e.g. VButton → V-Button, HTMLParser → HTML-Parser
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // e.g. NuxtStory → Nuxt-Story
        .toLowerCase()
}
