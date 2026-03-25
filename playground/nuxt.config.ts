import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
    modules: ['../src/module'],
    stories: {
        mode: 'shell',
        frameCwd: '.',
        framePort: 3000,
    },
    css: [
        join(currentDir, './app/assets/css/main.css')
    ]
})
