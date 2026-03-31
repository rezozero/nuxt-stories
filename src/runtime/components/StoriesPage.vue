<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStories } from '../composables/use-stories'
import StoryControlsPanel from './StoryControlsPanel.vue'
import StoriesNav from './StoriesNav.vue'
import StoriesToolbar from './StoriesToolbar.vue'
import type { ControlSchema } from '../composables/use-story-controls'
import 'primeicons/primeicons.css'

const route = useRoute()
const router = useRouter()
const { frameUrl } = useStories()

// ── Iframe ────────────────────────────────────────────────────────────────────

const iframeRef = ref<HTMLIFrameElement | null>(null)

const iframeSrc = computed(() => {
    const base = frameUrl(route.path)
    const params = new URLSearchParams(route.query as Record<string, string>)
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
})

const iframeStyle = ref({ width: '100%', height: '100%' })

// ── Controls panel (driven by postMessage from frame) ─────────────────────────

const controlsSchema = ref<ControlSchema | null>(null)

function onMessage(event: MessageEvent) {
    if (event.origin !== window.location.origin) return
    if (event.data?.source !== 'nuxt-stories-frame') return
    if (event.data.type === 'CONTROLS_SCHEMA') controlsSchema.value = event.data.schema
    if (event.data.type === 'CONTROLS_CLEAR') controlsSchema.value = null
}

function onControlChange(key: string, value: string) {
    const query = { ...route.query, [key]: value }
    // Update shell URL (bookmarkable state)
    router.replace({ query })
    // Live-update frame via postMessage (no iframe reload)
    iframeRef.value?.contentWindow?.postMessage(
        { source: 'nuxt-stories-shell', type: 'NAVIGATE', query },
        window.location.origin,
    )
}

onMounted(() => {
    window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
    window.removeEventListener('message', onMessage)
})
</script>

<template>
    <PvSplitter class="nuxt-stories-shell stories-page" state-key="nav">
        <PvSplitterPanel :size="20" :min-size="10">
            <StoriesNav />
        </PvSplitterPanel>
        <PvSplitterPanel :size="80" class="stories-main">
            <StoriesToolbar :iframe-src="iframeSrc" @update:viewport-style="iframeStyle = $event" />
            <div class="stories-page__frame-wrap">
                <iframe
                    ref="iframeRef"
                    :src="iframeSrc"
                    :style="iframeStyle"
                    class="stories-page__frame"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
            </div>
        </PvSplitterPanel>
        <StoryControlsPanel
            v-if="controlsSchema"
            :schema="controlsSchema"
            :values="route.query as Record<string, string>"
            @change="onControlChange"
        />
    </PvSplitter>
</template>

<style lang="scss">
.stories-page,
.stories-menu {
    font-family: Helvetica, sans-serif;
    font-size: 14px;
}

.stories-page {
    min-height: 100vh;
}

.stories-page a {
    text-decoration: none;
    font-size: inherit;
}

.stories-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.stories-page__frame-wrap {
    flex: 1;
    overflow: auto;
    background-color: #fff;
    display: flex;
    justify-content: center;
    padding: 1rem;
}

.stories-page__frame {
    border: none;
    display: block;
}
</style>
