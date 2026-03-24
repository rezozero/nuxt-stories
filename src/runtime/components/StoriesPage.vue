<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useStories } from '../composables/use-stories'
import StoriesNav from './StoriesNav.vue'
import StoryControlsPanel from './StoryControlsPanel.vue'
import type { ControlSchema } from '../composables/use-story-controls'

// Shell-level styles only (not loaded in the frame)
useHead({
    link: [{ rel: 'stylesheet', href: '/css/stories.css' }],
})

const route = useRoute()
const router = useRouter()
const { storiesUIVisible, frameUrl } = useStories()

// ── Iframe ────────────────────────────────────────────────────────────────────

const iframeRef = ref<HTMLIFrameElement | null>(null)

const iframeSrc = computed(() => {
    const base = frameUrl(route.path)
    const params = new URLSearchParams(route.query as Record<string, string>)
    const qs = params.toString()
    return qs ? `${base}?${qs}` : base
})

// ── Viewport presets ──────────────────────────────────────────────────────────

interface Preset {
    label: string
    width: number | null
    height: number | null
}

const PRESETS: Preset[] = [
    { label: '375', width: 375, height: 667 },
    { label: '768', width: 768, height: 1024 },
    { label: '1280', width: 1280, height: 800 },
    { label: '100%', width: null, height: null },
]

const viewportWidth = ref<number | null>(null)
const viewportHeight = ref<number | null>(null)

function applyPreset(preset: Preset) {
    viewportWidth.value = preset.width
    viewportHeight.value = preset.height
}

function swapDimensions() {
    const tmp = viewportWidth.value
    viewportWidth.value = viewportHeight.value
    viewportHeight.value = tmp
}

const iframeStyle = computed(() => ({
    width: viewportWidth.value ? `${viewportWidth.value}px` : '100%',
    height: viewportHeight.value ? `${viewportHeight.value}px` : '100%',
}))

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

// ── Keyboard shortcut: Cmd+\ toggles nav ─────────────────────────────────────

function onKeyDown(event: KeyboardEvent) {
    if (event.metaKey && (event.key === '\\' || event.key === '/')) {
        storiesUIVisible.value = !storiesUIVisible.value
    }
}

onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('message', onMessage)
})
</script>

<template>
    <div class="stories-page">
        <StoriesNav />

        <div class="stories-page__main">
            <div class="stories-page__toolbar">
                <button
                    v-for="preset in PRESETS"
                    :key="preset.label"
                    :class="[
                        'stories-page__toolbar__btn',
                        viewportWidth === preset.width &&
                            viewportHeight === preset.height &&
                            'stories-page__toolbar__btn--active',
                    ]"
                    @click="applyPreset(preset)"
                >
                    {{ preset.label }}
                </button>
                <button
                    v-if="viewportWidth !== null"
                    class="stories-page__toolbar__btn"
                    title="Swap dimensions"
                    @click="swapDimensions"
                >
                    ⇄
                </button>
                <span v-if="viewportWidth !== null" class="stories-page__toolbar__size">
                    {{ viewportWidth }} × {{ viewportHeight }}
                </span>
            </div>

            <div class="stories-page__frame-wrap">
                <iframe
                    ref="iframeRef"
                    :src="iframeSrc"
                    :style="iframeStyle"
                    class="stories-page__frame"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
            </div>
        </div>

        <StoryControlsPanel
            v-if="controlsSchema"
            :schema="controlsSchema"
            :values="(route.query as Record<string, string>)"
            @change="onControlChange"
        />
    </div>
</template>

<style lang="scss">
.stories-page {
    display: flex;
    height: 100vh;
    overflow: hidden;
}

.stories-page__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.stories-page__toolbar {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem 0.75rem;
    background-color: #f6f6f6ff;
    border-bottom: 1px solid #e3e3e3ff;
    font-family: Helvetica, sans-serif;
    font-size: 12px;
    flex-shrink: 0;
}

.stories-page__toolbar__btn {
    padding: 0.2rem 0.5rem;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;

    &--active {
        background-color: #222;
        color: #fff;
        border-color: #222;
    }

    &:hover:not(.stories-page__toolbar__btn--active) {
        background-color: #eee;
    }
}

.stories-page__toolbar__size {
    margin-left: 0.5rem;
    color: #666;
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
