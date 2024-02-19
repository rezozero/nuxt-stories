export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['../src/module'],
  stories: {
    include: '**/*.stories.vue',
    root: ['components', 'stories'],
  },
})
