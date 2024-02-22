<script setup lang="ts">
import { useStories } from '../composables/use-stories'

defineProps<{
    layout?: 'fullscreen' | 'default'
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
    display: flex;
}

.nuxt-story__main {
    flex-grow: 1;
    padding: 20px var(--story-main-padding, 2rem);

    .nuxt-story--layout-fullscreen & {
        padding: var(--story-main-padding, 0);
    }
}

.nuxt-story__aside {
    position: sticky;
    top: 0;
    overflow-y: auto;
    width: 17vw;
    min-width: 200px;
    max-width: 400px;
    padding: 1.5rem 2rem;
    resize: horizontal;
    z-index: 1000;
    height: 100vh;
    flex-shrink: 0;
    border-left: 1px solid #e3e3e3ff;
    background-color: #f6f6f6ff;
    font-size: 14px;

    @media (max-width: 767px) {
        display: none;
    }
}
</style>
