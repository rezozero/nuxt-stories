// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'

export default createConfigForNuxt({ features: { typescript: true } })
    .append({ ignores: ['dist', 'node_modules'] })
    .append(eslintPluginPrettier, {
        files: ['**/*.stories.vue', '**/layouts/*.vue', '**/pages/*.vue'],
        rules: { 'vue/multi-word-component-names': 'off' },
    })
