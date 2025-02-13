<script lang="ts" setup>
interface NuxtStoryVariantProps {
    title?: string
    mainClass?: string
}

defineProps<NuxtStoryVariantProps>()
</script>

<template>
    <div class="nuxt-story-variant">
        <div class="nuxt-story-variant__head">
            <h2 v-if="title" class="nuxt-story-variant__title">{{ title }}</h2>
        </div>
        <div class="nuxt-story-variant__main">
            <slot />
        </div>
    </div>
</template>

<style lang="scss">
.nuxt-story-variant {
    padding-block: 2rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.nuxt-story-variant__head {
    position: relative;
    flex-basis: 100%;
    margin-bottom: 1rem;
    z-index: 10;
    font-family: Helvetica, sans-serif;
}

.nuxt-story-variant__title {
    text-decoration: underline;
}

.nuxt-story-variant__main {
    display: flex;
    padding: 1rem 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem 3rem;
}
</style>
