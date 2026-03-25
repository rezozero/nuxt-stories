import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
    modules: ['../src/module'],
    stories: {
        mode: 'frame',
    },
    css: [
        join(currentDir, './app/assets/css/main.css')
    ]
})
