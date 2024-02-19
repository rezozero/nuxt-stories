<script setup lang="ts">
import {useStories} from "../composables/use-stories";

const { storiesNavIsOpen, toggleStoriesNav } = useStories()
</script>

<template>
    <button :class="$style.root" @click="toggleStoriesNav">
        <span :class="$style.root__icon">{{ storiesNavIsOpen ? '⇤' : '⇥' }}</span>
    </button>
</template>

<style module lang="scss">
.root {
    width: rem(32);
    height: rem(32);
    border: 1px solid #ccc;
    border-radius: 100%;
}

.root__icon {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: rem(4);
}
</style>
