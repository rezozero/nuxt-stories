<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStories } from '../composables/use-stories'

interface TreeNode {
    key: string
    label?: string
    data?: { to: string }
    children?: TreeNode[]
    leaf?: boolean
    [key: string]: unknown
}

const route = useRoute()
const router = useRouter()
const { storiesPath } = useStories()

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

function onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Escape') search.value = ''
}

onMounted(() => {
    window.addEventListener('keyup', onKeyUp)
})

onBeforeUnmount(() => {
    window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
    <div class="stories-nav">
        <PvTree
            :value="filteredItemList"
            selection-mode="single"
            :selection-keys="selectedKey"
            :expanded-keys="expandedKeys"
            filter
            class="stories-nav"
            @node-select="onNodeSelect"
        />
    </div>
</template>

<style lang="scss">
.stories-nav {
    height: 100vh;
    overflow: auto;
}
</style>
