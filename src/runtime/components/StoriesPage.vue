<script setup lang="ts">
import StoriesNav from './StoriesNav.vue'
import { useHead } from '#imports'

// global styles
useHead({
    link: [
        {
            rel: 'stylesheet',
            href: '/css/stories.css',
        },
    ],
})
</script>

<template>
    <NuxtLayout name="stories">
        <div :class="$style.root">
            <StoriesNav />
            <div :class="$style['page-wrapper']">
                <NuxtPage />
            </div>
        </div>
    </NuxtLayout>
</template>

<style module lang="scss">
.root {
    display: flex;
    font-family: Helvetica, sans-serif;
}

.page-wrapper {
    flex-grow: 1;
}
</style>
