import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const currentDir = dirname(fileURLToPath(import.meta.url))
const nuxtStoriesEnabled = process.env.NUXT_STORIES === '1'

export default defineNuxtConfig({
    modules: [
        ...(nuxtStoriesEnabled ? ['../src/module'] : []),
    ],
    stories: {
        enabled: nuxtStoriesEnabled,
        mode: 'shell',
        frameCwd: '.',
        framePort: 3000,
    },
    css: [
        join(currentDir, './app/assets/css/main.css')
    ],
})
