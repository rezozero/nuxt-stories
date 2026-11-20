<script setup lang="ts">
export interface PaginatedItem {
    id: number
    title: string
}

export interface PaginatedItemCollection {
    'hydra:member': PaginatedItem[]
    'hydra:totalItems': number
}

const props = defineProps({
    itemsPerPage: { type: Number, default: 5 },
})

const page = ref(1)
const itemsPerPage = computed(() => props.itemsPerPage)

// Not awaited, so the loading state is visible on the first render
const { data, status, error, refresh } = useFetch<PaginatedItemCollection>('/api/items', {
    query: { page, itemsPerPage },
})

const pageCount = computed(() => Math.ceil((data.value?.['hydra:totalItems'] ?? 0) / itemsPerPage.value) || 1)

watch(itemsPerPage, () => (page.value = 1))
</script>

<template>
    <div :class="$style.root">
        <p v-if="status === 'pending'" :class="$style.status">Loading…</p>
        <p v-else-if="error" :class="$style.status">Error: {{ error.message }}</p>
        <ul v-else :class="$style.list">
            <li v-for="item in data?.['hydra:member']" :key="item.id">{{ item.title }}</li>
        </ul>
        <nav :class="$style.pagination">
            <button :disabled="page <= 1" @click="page--">Previous</button>
            <span>{{ page }} / {{ pageCount }}</span>
            <button :disabled="page >= pageCount" @click="page++">Next</button>
            <button @click="refresh()">Reload</button>
        </nav>
    </div>
</template>

<style module lang="scss">
.root {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 240px;
}

.list,
.status {
    min-height: 120px;
    margin: 0;
}

.pagination {
    display: flex;
    gap: 8px;
    align-items: center;
}
</style>
