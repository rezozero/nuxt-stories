<script lang="ts" setup></script>

<template>
    <NuxtStory>
        <template #aside> aside content </template>
        <div :class="$style.container">
            <div v-for="index in 10" :key="index" :class="$style.card"></div>
        </div>
    </NuxtStory>
</template>

<style lang="scss" module>
.container {
    display: flex;
    outline: 1px solid red;
    overflow: auto;
}

.card {
    outline: 1px solid black;
    height: 200px;
    width: 300px;
    flex-shrink: 0;
}
</style>
