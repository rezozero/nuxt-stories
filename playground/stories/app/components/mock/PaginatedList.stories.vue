<script lang="ts" setup>
import { delay, http, HttpResponse } from 'msw'

interface Item {
    id: number
    title: string
}

interface ItemCollection {
    'hydra:member': Item[]
    'hydra:totalItems': number
}

const TOTAL_ITEMS = 42

const controls = useStoryControls({
    loadingDelay: { type: 'range', min: 0, max: 3000, step: 100, default: 600 },
    itemsPerPage: { type: 'range', min: 1, max: 20, default: 5 },
})

// The resolver runs on each request, so control changes apply to the next fetch
useMockRequest(
    http.get('*/api/items', async ({ request }) => {
        await delay(controls.loadingDelay)

        const url = new URL(request.url)
        const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
        const itemsPerPage = Math.max(1, Number(url.searchParams.get('itemsPerPage')) || 5)
        const start = (page - 1) * itemsPerPage
        const end = Math.min(start + itemsPerPage, TOTAL_ITEMS)

        return HttpResponse.json<ItemCollection>({
            'hydra:member': Array.from({ length: Math.max(0, end - start) }, (_, index) => ({
                id: start + index + 1,
                title: `Item ${start + index + 1}`,
            })),
            'hydra:totalItems': TOTAL_ITEMS,
        })
    }),
)

const page = ref(1)
const itemsPerPage = computed(() => controls.itemsPerPage)

// Not awaited, so the loading state is visible on the first render
const { data, status, error, refresh } = useFetch<ItemCollection>('/api/items', {
    query: { page, itemsPerPage },
})

const pageCount = computed(() => Math.ceil((data.value?.['hydra:totalItems'] ?? 0) / itemsPerPage.value) || 1)

watch(itemsPerPage, () => (page.value = 1))
</script>

<template>
    <NuxtStory>
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
    </NuxtStory>
</template>

<style lang="scss" module>
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
