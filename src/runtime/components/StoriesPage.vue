<script setup lang="ts">
// definePageMeta({
//     pageTransition: false,
// })
import StoriesNav from "./StoriesNav.vue";
import StoriesTopBar from "./StoriesTopBar.vue";
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
