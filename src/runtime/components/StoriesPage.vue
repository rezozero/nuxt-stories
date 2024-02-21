<script setup lang="ts">
import StoriesNav from './StoriesNav.vue'
</script>

<template>
    <NuxtLayout name="stories">
        <div :class="$style.root">
            <StoriesNav />
            <div :class="$style['page-wrapper']">
                <NuxtPage />
            </div>
        </div>
    </NuxtLayout>
</template>

<style module lang="scss">
.root {
    display: flex;
    font-family: Helvetica, sans-serif;
}

.page-wrapper {
    flex-grow: 1;
}

.root button {
    background-color: transparent;
    border: unset;
}

.root button {
    background-color: transparent;
}
</style>
