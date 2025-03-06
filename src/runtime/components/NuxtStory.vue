<script setup lang="ts">
import { useStories } from '../composables/use-stories'

defineProps<{
    layout?: 'fullscreen' | 'default'
    mainClass?: string
    asideClass?: string
}>()

const { storiesUIVisible } = useStories()
</script>

<template>
    <div :class="['nuxt-story', layout && 'nuxt-story--layout-' + layout]">
        <div class="nuxt-story__main">
            <slot />
        </div>
        <div v-if="$slots.aside" v-show="storiesUIVisible" class="nuxt-story__aside">
            <slot name="aside" />
        </div>
    </div>
</template>

<style lang="scss">
.nuxt-story {
    display: grid;
    grid-template-columns: minmax(0, 1fr);

    @media (min-width: 767px) {
        grid-template-columns: minmax(0, 1fr) auto;
    }
}

.nuxt-story__main {
    flex-grow: 1;
    padding: 20px var(--story-main-padding, 2rem);
    width: var(--story-main-width, 100%);

    .nuxt-story--layout-fullscreen & {
        padding: var(--story-main-padding, 0);
    }
}

.nuxt-story__aside {
    overflow-y: auto;
    max-height: 30vh;
    padding: 1.5rem 2rem;
    border-left: 1px solid #e3e3e3ff;
    background-color: #f6f6f6ff;
    font-family: Helvetica, sans-serif;
    font-size: 14px;
    grid-row: 1;

    @media (min-width: 767px) {
        position: sticky;
        z-index: 1000;
        top: 0;
        grid-row: initial;
        max-height: initial;
        min-width: 200px;
        max-width: 400px;
        width: 17vw;
        height: 100vh;
    }
}
</style>
