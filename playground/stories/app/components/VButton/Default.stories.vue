<script setup lang="ts">
const controls = useStoryControls({
    label: { type: 'text', default: 'Click me' },
    big: { type: 'boolean', default: false },
})
</script>

<template>
    <NuxtStory>
        <NuxtStoryVariant title="Interactive (use the Controls panel →)">
            <VButton :big="controls.big">{{ controls.label }}</VButton>
        </NuxtStoryVariant>
        <NuxtStoryVariant title="Default">
            <VButton>Test</VButton>
        </NuxtStoryVariant>
        <NuxtStoryVariant title="Big">
            <VButton big>Test big</VButton>
        </NuxtStoryVariant>
    </NuxtStory>
</template>
