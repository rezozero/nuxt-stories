<script setup lang="ts">
import StoriesNav from './StoriesNav.vue'
import { useHead, useStories } from '#imports'
import { onBeforeUnmount, onMounted } from 'vue'

// global styles
useHead({
    link: [
        {
            rel: 'stylesheet',
            href: '/css/stories.css',
        },
    ],
})

// UI visibility
const { storiesUIVisible } = useStories()

function onKeyDown(event: KeyboardEvent) {
    if (event.metaKey && (event.key === '\\' || event.key === '/')) {
        storiesUIVisible.value = !storiesUIVisible.value
    }
}

onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
    <div class="stories-page">
        <StoriesNav />
        <NuxtPage />
    </div>
</template>

<style lang="scss">
.stories-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr);

    @media (min-width: 767px) {
        grid-template-columns: auto minmax(0, 1fr);
    }
}
</style>
