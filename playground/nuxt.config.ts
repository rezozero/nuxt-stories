export default defineNuxtConfig({
    devtools: { enabled: true },
    modules: ['../src/module'],
    css: ['~/assets/css/main.css'],
    // extends: ['../playground-layer'], // the layer add the nuxt-stories module itself
})
