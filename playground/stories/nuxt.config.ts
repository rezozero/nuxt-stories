import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  modules: ['../../src/module'],
  stories: {
    mode: 'shell',
    frameCwd: '../',   // path to the frame app (playground/)
    framePort: 3000,
  },
})