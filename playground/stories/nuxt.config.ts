export default defineNuxtConfig({
    extends: ['../'],
    modules: ['../../src/module'],
    ssr: false,
    devServer: {
        port: 6006,
    },
    stories: {
        mode: 'shell',
        frameCwd: '../',
    },
})
