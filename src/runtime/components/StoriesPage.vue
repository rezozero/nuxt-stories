<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useStories } from '../composables/use-stories'
import StoryControlsPanel from './StoryControlsPanel.vue'
import type { ControlSchema } from '../composables/use-story-controls'

// Minimal TreeNode shape expected by PrimeVue's Tree component
interface TreeNode {
    key?: string
    label?: string
    data?: { to: string }
    children?: TreeNode[]
    leaf?: boolean
    [key: string]: unknown
}

// Shell-level styles only (not loaded in the frame)
useHead({
    link: [{ rel: 'stylesheet', href: '/css/stories.css' }],
})

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

// All folder nodes are expanded by default
const expandedKeys = computed((): Record<string, boolean> => {
    const keys: Record<string, boolean> = {}
    function collect(nodes: TreeNode[]) {
        nodes.forEach((node) => {
            if (node.children) {
                keys[node.key as string] = true
                collect(node.children)
            }
        })
    }
    collect(itemList.value)
    return keys
})

// Highlight the active route — leaf key === route.path
const selectionKeys = computed((): Record<string, boolean> => ({ [route.path]: true }))

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
    <PvSplitter class="nuxt-stories-shell">
        <PvSplitterPanel v-show="storiesUIVisible" :class="['stories-nav', navIsOpen && 'stories-nav--open']">
            <div class="stories-nav__head">
                <NuxtLink :to="storiesPath('/')" class="stories-nav__title">Stories</NuxtLink>
                <PvButton class="stories-nav__toggle" aria-label="Toggle nav" @click="navIsOpen = !navIsOpen" />
            </div>
            <div class="stories-nav__main">
                <div class="stories-nav__search">
                    <PvInputText v-model="search" type="text" class="stories-nav__search__input" placeholder="Search…" />
                    <PvButton v-if="search" class="stories-nav__search__clear" aria-label="Clear search" @click="search = ''" />
                </div>
                <PvTree
                    :value="filteredItemList"
                    selection-mode="single"
                    :selection-keys="selectionKeys"
                    :expanded-keys="expandedKeys"
                    class="stories-nav__tree"
                    @node-select="onNodeSelect"
                />
            </div>
        </PvSplitterPanel>

        <PvSplitterPanel class="stories-page__main">
            <div class="stories-page__toolbar">
                <PvButton
                    v-for="preset in PRESETS"
                    :key="preset.label"
                    :class="[
                        'stories-page__toolbar__btn',
                        viewportWidth === preset.width &&
                            viewportHeight === preset.height &&
                            'stories-page__toolbar__btn--active',
                    ]"
                    @click="applyPreset(preset)"
                >{{ preset.label }}</PvButton>
                <PvButton
                    v-if="viewportWidth !== null"
                    class="stories-page__toolbar__btn"
                    title="Swap dimensions"
                    @click="swapDimensions"
                >⇄</PvButton>
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
.stories-nav {
    position: sticky;
    z-index: 1000;
    top: 0;
    width: 100%;
    flex-shrink: 0;
    border-right: 1px solid #e3e3e3ff;
    background-color: #f6f6f6ff;
    font-family: Helvetica, sans-serif;
    font-size: 14px;
    overflow-y: auto;

    @media (min-width: 768px) {
        overflow: auto;
        width: 17vw;
        height: 100vh;
        min-width: 150px;
        max-width: 400px;
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

.stories-nav__head {
    position: sticky;
    z-index: 1;
    top: 0;
    display: flex;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid #e3e3e3ff;
    background-color: inherit;

    @media (min-width: 768px) {
        padding-inline: 0;
    }
}

.stories-nav__title {
    font-size: 1.3rem;
    text-decoration: none;
    color: inherit;
}

.stories-nav__toggle {
    all: unset;
    display: flex;
    width: 2.5rem;
    height: 2.5rem;
    margin-left: auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    background-color: lightgrey;
    border-radius: 100%;
    cursor: pointer;

    @media (min-width: 768px) {
        display: none;
    }

    &::before,
    &::after {
        display: block;
        width: 14px;
        height: 2px;
        content: '';
        background-color: currentColor;
    }

    .stories-nav--open &::before {
        transform: translateY(2px) rotate(45deg);
    }

    .stories-nav--open &::after {
        transform: translateY(-2px) rotate(-45deg);
    }
}

.stories-nav__main {
    display: none;
    margin-top: 1em;
    padding: 1rem 1rem 2rem;

    @media (min-width: 768px) {
        display: block;
        padding-inline: 0;
    }

    .stories-nav--open & {
        display: block;
    }
}

.stories-nav__search {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: 6px;
    margin-bottom: 16px;
    background-color: rgba(0, 0, 0, 0.04);
}

.stories-nav__search__input {
    width: 100%;
    border: none;
    background-color: transparent;
    padding: 0.5em 0.5rem;
    font-size: 13px;
    outline: none;
}

.stories-nav__search__clear {
    all: unset;
    position: absolute;
    right: 8px;
    display: flex;
    width: 18px;
    align-items: center;
    justify-content: center;
    border-radius: 100vmax;
    aspect-ratio: 1;
    background-color: lightgrey;
    cursor: pointer;

    &::before,
    &::after {
        position: absolute;
        background-color: black;
        content: '';
        rotate: 45deg;
    }

    &::before {
        width: 1px;
        height: 50%;
    }

    &::after {
        width: 50%;
        height: 1px;
    }
}

// PrimeVue Tree — unstyled mode, styled with BEM-like selectors
.stories-nav__tree {
    list-style: none;
    margin: 0;
    padding: 0;

    // PrimeVue Tree root ul
    ul {
        list-style: none;
        margin: 0;
        padding-left: 1em;
    }

    // toggler button (expand/collapse)
    [data-pc-section='toggler'] {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.2rem;
        height: 1.2rem;
        margin-right: 0.3rem;
        border-radius: 100%;
        background-color: #e4e4e4;
        cursor: pointer;
        font-size: 0.7rem;
        flex-shrink: 0;
    }

    // folder node row
    [data-pc-section='content'] {
        display: flex;
        align-items: center;
        padding: 0.25rem 0.3rem;
        border-radius: 0.3rem;
        cursor: pointer;
        user-select: none;

        &:hover {
            background-color: rgba(0, 0, 0, 0.06);
        }
    }

    // folder label
    [data-pc-section='nodelabel'] {
        font-size: 13px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    // folder node rows get a small top margin
    [data-pc-section='node']:not([data-pc-leaf='true']) > [data-pc-section='content'] {
        margin-top: 0.5rem;
        font-weight: 600;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #888;
    }

    // selected (active) leaf
    [data-pc-section='node'][aria-selected='true'] > [data-pc-section='content'] {
        background-color: #222;
        color: #fff;
    }
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



