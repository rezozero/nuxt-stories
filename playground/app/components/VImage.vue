<script setup lang="ts">
import { joinURL } from 'ufo';

const { src } = defineProps({
    src: {
        type: String,
        required: true,
    },
})

const internalSrc = computed(() => joinURL(useRuntimeConfig().app.baseURL, src));
</script>

<template>
    <img :src="internalSrc" />
</template>
