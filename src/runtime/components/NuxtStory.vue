<script setup lang="ts">
import { useStories } from '../composables/use-stories'

defineProps<{
    layout?: 'fullscreen' | 'default'
}>()

const { storiesUIVisible } = useStories()
</script>

<template>
    <div :class="[$style.root, layout && $style['root--layout-' + layout]]">
        <div :class="$style.main">
            <slot />
        </div>
        <div v-if="$slots.aside && storiesUIVisible" :class="$style.aside">
            <slot name="aside" />
        </div>
    </div>
</template>

<style lang="scss" module>
.root {
    display: flex;
}

.main {
    flex-grow: 1;
    padding: 20px var(--story-main-padding, 2rem);

    &--layout-fullscreen {
        padding: var(--story-main-padding, 0);
    }
}

.aside {
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

    @media (max-width: 768px) {
        display: none;
    }
}
</style>
