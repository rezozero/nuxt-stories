<script setup lang="ts">
import StoriesNavToggle from './StoriesNavToggle.vue'
</script>

<template>
    <div :class="$style.root">
        <StoriesNavToggle :class="$style.toggle" />
    </div>
</template>

<style module lang="scss">
.root {
    display: flex;
    width: 100%;
    height: 56px;
    align-items: center;
    background-color: #f6f6f6ff;
}

.toggle {
    margin-left: 10px;
}
</style>
