<script setup lang="ts">
// definePageMeta({
//     pageTransition: false,
// })
</script>

<template>
    <div :class="$style.root">
        <StoriesNav />
        <div :class="$style['page-wrapper']">
            <StoriesTopBar />
            <NuxtPage />
        </div>
    </div>
</template>

<style module lang="scss">
.root {
    display: flex;
}

.page-wrapper {
    flex-grow: 1;
}
</style>
