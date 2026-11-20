import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export default defineNuxtConfig({
    extends: ['../'],
    modules: ['../../src/module'],
    ssr: false,
    devServer: {
        port: 6006,
    },
    vite: {
        resolve: {
            // The module is linked from the repository root: PrimeVue resolves there and must share the app's Vue
            alias: [{ find: /^vue$/, replacement: require.resolve('vue/dist/vue.runtime.esm-bundler.js') }],
        },
    },
    stories: {
        mode: 'shell',
        frameCwd: '../',
    },
})
