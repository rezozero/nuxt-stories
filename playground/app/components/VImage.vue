<script setup lang="ts">
defineProps({
    src: {
        type: String,
        required: true,
    },
})
</script>

<template>
    <img :src="src" />
</template>
