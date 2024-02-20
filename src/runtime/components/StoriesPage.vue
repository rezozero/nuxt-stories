<script setup lang="ts">
import StoriesNav from './StoriesNav.vue'
import StoriesTopBar from './StoriesTopBar.vue'

definePageMeta({
  layout: 'stories',
})
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
