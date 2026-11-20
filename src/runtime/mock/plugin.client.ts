import { joinURL } from 'ufo'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { startMockWorker } from './worker'

export default defineNuxtPlugin({
    name: 'nuxt-stories:mock-worker',
    enforce: 'pre',
    async setup() {
        // Awaited so the worker intercepts the very first requests made by a story
        try {
            await startMockWorker(joinURL(useRuntimeConfig().app.baseURL, 'mockServiceWorker.js'))
        } catch (error) {
            // e.g. insecure context or service workers blocked: stories still render, unmocked
            console.warn('[nuxt-stories] Unable to start the mock service worker.', error)
        }
    },
})
