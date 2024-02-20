<script setup lang="ts">
defineProps<{
    layout?: 'fullscreen' | 'default'
}>()
</script>

<template>
    <div :class="[$style.root, layout && $style['root--layout-' + layout]]">
        <slot />
    </div>
</template>

<style lang="scss" module>
.root {
    padding: 20px var(--story-padding, 2rem);

    &--layout-fullscreen {
        padding: var(--story-padding, 0);
    }
}
</style>
