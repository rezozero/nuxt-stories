import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
    extends: ['../'],
    modules: [
        '../../src/module'
    ],
    stories: {
        mode: 'shell',
        frameCwd: '../',
        framePort: 3000,
    },
})
