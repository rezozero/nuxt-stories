<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
    // Signal to the parent shell that the frame is ready
    if (window.parent !== window) {
        window.parent.postMessage({ source: 'nuxt-stories-frame', type: 'FRAME_READY' }, window.location.origin)
    }

    // Listen for NAVIGATE messages from the shell (live control updates)
    window.addEventListener('message', (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data?.source !== 'nuxt-stories-shell') return
        if (event.data?.type === 'NAVIGATE') {
            router.replace({ query: event.data.query })
        }
    })
})
</script>

<template>
    <NuxtPage />
</template>
