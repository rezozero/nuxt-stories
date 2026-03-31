import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
    modules: ['@nuxt/icon'],
    css: [
        join(currentDir, './app/assets/css/main.css')
    ],
})