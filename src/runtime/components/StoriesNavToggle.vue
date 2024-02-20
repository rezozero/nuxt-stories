<script setup lang="ts">
import { useStories } from '../composables/use-stories'

const { storiesNavIsOpen, toggleStoriesNav } = useStories()
</script>

<template>
    <button :class="$style.root" @click="toggleStoriesNav">
        <span :class="$style.root__icon">{{ storiesNavIsOpen ? '⇤' : '⇥' }}</span>
    </button>
</template>

<style module lang="scss">
.root {
    width: 32px;
    height: 32px;
    border: 1px solid #ccc;
    border-radius: 100%;
}

.root__icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
}
</style>
