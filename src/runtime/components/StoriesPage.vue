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
    if (event.metaKey && event.key === '\\') {
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
