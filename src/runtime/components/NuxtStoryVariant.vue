<script lang="ts" setup>
interface NuxtStoryVariantProps {
    title?: string
    mainClass?: string
}

defineProps<NuxtStoryVariantProps>()
</script>

<template>
    <div :class="$style.root">
        <div :class="$style.head">
            <h2 v-if="title" :class="$style.title">{{ title }}</h2>
        </div>
        <div :class="[$style.main, mainClass]">
            <slot />
        </div>
    </div>
</template>

<style lang="scss" module>
.root {
    padding-block: 2rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.head {
    position: relative;
    flex-basis: 100%;
    margin-bottom: 1rem;
    z-index: 10;
}

.title {
    text-decoration: underline;
}

.main {
    display: flex;
    padding: 1rem 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem 3rem;
}
</style>
