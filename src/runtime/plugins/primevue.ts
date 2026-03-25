import { defineNuxtPlugin } from '#app'
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Tree from 'primevue/tree'

export default defineNuxtPlugin((nuxtApp) => {
    // Only install PrimeVue if not already set up by the consuming app.
    // Using unstyled: true so no PrimeVue theme CSS is injected — the shell
    // is styled exclusively via its own SCSS (BEM classes), keeping the frame
    // document completely free of any nuxt-stories CSS.
    if (!nuxtApp.vueApp.config.globalProperties.$primevue) {
        nuxtApp.vueApp.use(PrimeVue, { unstyled: true })
    }

    // Register with 'Pv' prefix to avoid naming conflicts with the consuming
    // app's own PrimeVue component registrations.
    nuxtApp.vueApp.component('PvButton', Button)
    nuxtApp.vueApp.component('PvInputText', InputText)
    nuxtApp.vueApp.component('PvTree', Tree)
})
