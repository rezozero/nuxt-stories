export default defineNuxtConfig({
    extends: ['../'],
    modules: ['../../src/module'],
    stories: {
        mode: 'shell',
        frameCwd: '../',
        framePort: 3000,
    },
})
