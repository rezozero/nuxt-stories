import { defineNuxtPlugin, tryUseNuxtApp } from '#app'
import { startMockServer } from './server'
import { getRenderMockGroups } from './use-mock-request'

export default defineNuxtPlugin({
    name: 'nuxt-stories:mock-server',
    enforce: 'pre',
    async setup() {
        // Handlers live as long as the render's Nuxt app (garbage-collected with it), so requests
        // still in flight after `app:rendered` stay mocked.
        // `experimental.asyncContext` (enabled by the module) keeps tryUseNuxtApp() bound
        // to the render that issued the request, across awaits.
        try {
            await startMockServer(() => {
                const app = tryUseNuxtApp()
                return app ? getRenderMockGroups(app) : undefined
            })
        } catch (error) {
            console.warn('[nuxt-stories] Unable to start the mock server.', error)
        }
    },
})
