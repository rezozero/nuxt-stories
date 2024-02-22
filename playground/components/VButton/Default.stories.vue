<script setup lang="ts"></script>

<template>
    <NuxtStory :class="$style.root">
        <NuxtStoryVariant title="Default">
            <VButton>Test</VButton>
        </NuxtStoryVariant>
        <NuxtStoryVariant title="Big">
            <VButton big>Test big</VButton>
        </NuxtStoryVariant>
    </NuxtStory>
</template>

<style module lang="scss">
.root :global(.nuxt-story-variant) {
    // background-color: red;
}
</style>
