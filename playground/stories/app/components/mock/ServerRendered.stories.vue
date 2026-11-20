<script lang="ts" setup>
import { http, HttpResponse } from 'msw'

interface Article {
    id: number
    title: string
}

// Absolute URL: on the server, relative `/api/…` calls are served by Nitro without a
// network request, so only absolute URLs can be mocked during SSR.
const ARTICLES_URL = 'https://api.example.test/articles'

useMockRequest(
    http.get(ARTICLES_URL, () =>
        HttpResponse.json<Article[]>([
            { id: 1, title: `Rendered on the ${import.meta.server ? 'server' : 'client'}` },
            { id: 2, title: 'Second article' },
        ]),
    ),
)

// Awaited: with `frameSsr`, the data is fetched during SSR and reaches the client in the payload
const { data, refresh } = await useFetch<Article[]>(ARTICLES_URL)
</script>

<template>
    <NuxtStory>
        <ul>
            <li v-for="article in data" :key="article.id">{{ article.title }}</li>
        </ul>
        <button @click="refresh()">Refetch on the client</button>
    </NuxtStory>
</template>
