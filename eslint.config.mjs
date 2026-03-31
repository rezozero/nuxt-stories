// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'

export default createConfigForNuxt({})
    .append({ ignores: ['dist', 'node_modules'] })
    .append(eslintPluginPrettier, {
        files: ['**/*.stories.vue'],
        rules: { 'vue/multi-word-component-names': 'off' },
    })
