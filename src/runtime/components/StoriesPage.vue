<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useRuntimeConfig } from '#imports'
import { joinURL } from 'ufo'
import { useStories } from '../composables/use-stories'
import StoryControlsPanel from './StoryControlsPanel.vue'
import type { ControlSchema } from '../composables/use-story-controls'
import 'primeicons/primeicons.css'

// Minimal TreeNode shape expected by PrimeVue's Tree component
interface TreeNode {
    key?: string
    label?: string
    data?: { to: string }
    children?: TreeNode[]
    leaf?: boolean
    [key: string]: unknown
}

const route = useRoute()
const router = useRouter()
const { storiesUIVisible, frameUrl, storiesPath } = useStories()

// ── Stories Nav ────────────────────────────────────────────────────────────────────

// Use router.getRoutes() instead of route.matched to avoid infinite recursion.
const storyRoutes = router.getRoutes().filter((r) => r.name?.toString().startsWith('shell-'))

// Build a PrimeVue TreeNode[] from the file-path parts of each story route.
// Leaf node keys equal the story URL (route.path), which makes selectionKeys
// trivially computable without walking the tree.
function addToTree(nodes: TreeNode[], parts: string[], to: string, keyPrefix: string): void {
    if (!parts.length) return
    const part = parts[0] as string
    const key = keyPrefix ? `${keyPrefix}/${part}` : part
    if (parts.length === 1) {
        // leaf — use the destination URL as the unique key
        nodes.push({ key: to, label: part, data: { to }, leaf: true })
    } else {
        let folder = nodes.find((n) => n.label === part && !n.leaf)
        if (!folder) {
            folder = { key, label: part, children: [] }
            nodes.push(folder)
        }
        if (folder.children) addToTree(folder.children, parts.slice(1), to, key)
    }
}

const itemList = computed((): TreeNode[] => {
    const result: TreeNode[] = []
    storyRoutes.forEach((r) => {
        const filePath = r.meta?.filePath as string | undefined
        if (!filePath) return
        const parts = filePath.split('/').filter(Boolean)
        const relativePath = r.name!.toString().slice('shell-'.length)
        addToTree(result, parts, storiesPath(relativePath), '')
    })
    return result
})

const search = ref('')

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
    return nodes.reduce<TreeNode[]>((acc, node) => {
        if (node.children) {
            const filtered = filterTree(node.children, query)
            if (filtered.length) acc.push({ ...node, children: filtered })
        } else if (node.label?.toLowerCase().includes(query.toLowerCase())) {
            acc.push(node)
        }
        return acc
    }, [])
}

const filteredItemList = computed((): TreeNode[] => {
    if (!search.value) return itemList.value
    return filterTree(itemList.value, search.value)
})

// Only expand folders that are ancestors of the currently selected leaf
const expandedKeys = computed((): Record<string, boolean> => {
    const keys: Record<string, boolean> = {}
    function findPath(nodes: TreeNode[]): boolean {
        for (const node of nodes) {
            if (node.leaf) {
                if (node.key === route.path) return true
            } else if (node.children) {
                if (findPath(node.children)) {
                    keys[node.key as string] = true
                    return true
                }
            }
        }
        return false
    }
    findPath(itemList.value)
    return keys
})

// Highlight the active route — leaf key === route.path
const selectedKey = computed((): Record<string, boolean> => ({ [route.path]: true }))

function onNodeSelect(node: TreeNode) {
    if (node.data?.to) router.push(node.data.to)
}

const navIsOpen = ref(false)
watch(() => route.fullPath, () => { navIsOpen.value = false })

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

const presetMenuRef = ref()

function togglePresetMenu(event: Event) {
    presetMenuRef.value?.toggle(event)
}

const presetMenuModel = computed(() =>
    PRESETS.map((preset) => ({
        label: preset.label,
        icon: viewportWidth.value === preset.width && viewportHeight.value === preset.height ? 'pi pi-check' : undefined,
        command: () => applyPreset(preset),
    }))
)

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

function onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Escape') search.value = ''
}

onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('message', onMessage)
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('message', onMessage)
})
</script>

<template>
    <PvSplitter class="nuxt-stories-shell stories-page">
        <PvSplitterPanel v-show="storiesUIVisible" :class="['stories-nav', navIsOpen && 'stories-nav--open']">
            <PvTree
                :value="filteredItemList"
                selection-mode="single"
                :selection-keys="selectedKey"
                :expanded-keys="expandedKeys"
                filter
                class="stories-nav__tree"
                @node-select="onNodeSelect"
            />
        </PvSplitterPanel>
        <PvSplitterPanel class="stories-main">
            <PvToolbar>
                <template #start>
                    <div class="stories-button-group">
                        <PvButton
                            icon="pi pi-desktop"
                            severity="secondary"
                            aria-haspopup="true"
                            aria-controls="preset-menu"
                            @click="togglePresetMenu"
                        />
                        <PvMenu
                            id="preset-menu"
                            ref="presetMenuRef"
                            :model="presetMenuModel"
                            popup
                            class="stories-menu"
                        />
                        <PvButton
                            v-if="viewportWidth !== null"
                            icon="pi pi-arrow-right-arrow-left"
                            severity="secondary"
                            title="Swap dimensions"
                            @click="swapDimensions"
                        />
                        <span v-if="viewportWidth !== null" class="stories-page__toolbar__size">
                            {{ viewportWidth }} × {{ viewportHeight }}
                        </span>
                    </div>
                </template>
                <template #end>
                    <PvButton
                        as="a"
                        icon="pi pi-external-link"
                        severity="secondary"
                        :href="iframeSrc"
                        label="Open the story"
                        target="_blank"
                        rel="noopener"
                    />
                </template>
            </PvToolbar>    
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
            :values="(route.query as Record<string, string>)"
            @change="onControlChange"
        />
    </PvSplitter>
</template>

<style lang="scss">
.stories-page,
.stories-menu  {
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

.stories-button-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.stories-nav {
    position: sticky;
    top: 0;
    width: 100%;
    flex-shrink: 0;

    @media (min-width: 768px) {
        overflow: auto;
        width: 17vw;
        min-width: 150px;
        max-width: 400px;
        min-height: 100%;
        padding-inline: 1rem;
        resize: horizontal;
    }

    &--open {
        @media (max-width: 767px) {
            position: fixed;
            height: 100vh;
        }
    }
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



