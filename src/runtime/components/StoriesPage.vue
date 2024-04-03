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
        <div class="stories-page__main">
            <NuxtPage />
        </div>
    </div>
</template>

<style lang="scss">
.stories-page {
    display: flex;
    font-family: Helvetica, sans-serif;

    @media (max-width: 767px) {
        flex-wrap: wrap;
    }
}

.stories-page__main {
    flex-grow: 1;
}
</style>
