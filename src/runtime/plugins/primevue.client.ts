import { defineNuxtPlugin } from '#app'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import Tree from 'primevue/tree'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Toolbar from 'primevue/toolbar'
import Menu from 'primevue/menu'

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.use(PrimeVue, {
        theme: { preset: Aura },
    })
    nuxtApp.vueApp.component('PvTree', Tree)
    nuxtApp.vueApp.component('PvButton', Button)
    nuxtApp.vueApp.component('PvInputText', InputText)
    nuxtApp.vueApp.component('PvSplitter', Splitter)
    nuxtApp.vueApp.component('PvSplitterPanel', SplitterPanel)
    nuxtApp.vueApp.component('PvToolbar', Toolbar)
    nuxtApp.vueApp.component('PvMenu', Menu)
})
