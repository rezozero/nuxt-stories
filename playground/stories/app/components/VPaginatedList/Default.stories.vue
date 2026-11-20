<script lang="ts" setup>
import { delay, http, HttpResponse } from 'msw'
import type { PaginatedItemCollection } from '~/components/VPaginatedList.vue'

const TOTAL_ITEMS = 42

const controls = useStoryControls({
    loadingDelay: { type: 'range', min: 0, max: 3000, step: 100, default: 600 },
    itemsPerPage: { type: 'range', min: 1, max: 20, default: 5 },
})

// Mocks the requests made by <VPaginatedList>. The resolver runs on each request,
// so control changes apply to the next fetch.
useMockRequest(
    http.get('*/api/items', async ({ request }) => {
        await delay(controls.loadingDelay)

        const url = new URL(request.url)
        const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
        const itemsPerPage = Math.max(1, Number(url.searchParams.get('itemsPerPage')) || 5)
        const start = (page - 1) * itemsPerPage
        const end = Math.min(start + itemsPerPage, TOTAL_ITEMS)

        return HttpResponse.json<PaginatedItemCollection>({
            'hydra:member': Array.from({ length: Math.max(0, end - start) }, (_, index) => ({
                id: start + index + 1,
                title: `Item ${start + index + 1}`,
            })),
            'hydra:totalItems': TOTAL_ITEMS,
        })
    }),
)
</script>

<template>
    <NuxtStory>
        <VPaginatedList :items-per-page="controls.itemsPerPage" />
    </NuxtStory>
</template>
