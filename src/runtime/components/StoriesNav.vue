<script setup lang="ts">
import type { RouteRecordRaw } from 'vue-router'
import type { ComponentPublicInstance } from 'vue'
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useStories } from '../composables/use-stories'
import StoriesNavItem, { type NavItem } from './StoriesNavItem.vue'

const route = useRoute()

const childRoutes = computed(() => {
    return route.matched[0]?.children
})

const { storiesNavIsOpen, storiesPath } = useStories()

const itemList = computed(() => {
    const result: NavItem = {}

    childRoutes.value.forEach((childRoute: RouteRecordRaw) => {
        const filePath = childRoute.meta?.filePath as string | undefined

        if (!filePath) return

        const filePathParts = filePath.split('/').filter((value) => value !== '')

        let root = result

        filePathParts.forEach((filePathPart, index) => {
            if (index === filePathParts.length - 1) {
                root[filePathPart] = {
                    to: storiesPath(childRoute.path),
                    label: filePathPart,
                }
            } else {
                if (!root[filePathPart]) root[filePathPart] = {}

                root = root[filePathPart] as NavItem
            }
        })
    })

    return result
})

const toggle = ref<ComponentPublicInstance | null>(null)
watch(
    () => route.params,
    () => {
        if (toggle.value && getComputedStyle(toggle.value.$el).display !== 'none') {
            storiesNavIsOpen.value = false
        }
    },
)

function onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Escape') search.value = ''
    if (event.key === 's' && document.activeElement?.tagName !== 'INPUT') {
        storiesNavIsOpen.value = !storiesNavIsOpen.value
    }
    // if (event.key === 't') toggleStoriesNav()
}

onMounted(() => {
    window.addEventListener('keyup', onKeyUp)
})

onBeforeUnmount(() => {
    window.removeEventListener('keyup', onKeyUp)
})

const search = ref('')

function filterComponentByName(query: string) {
    const itemEntries = Object.entries(itemList.value)
    const result: NavItem = {}

    itemEntries.forEach(([folder, content]) => {
        const components = Object.entries(content as Record<string, unknown>)

        components.forEach(([name, value]) => {
            const isMatching = name.toLowerCase().includes(query.toLowerCase())
            if (!isMatching) return

            if (result?.[folder]) result[folder][name] = value
            else Object.assign(result, { [folder]: { [name]: value } })
        })
    })

    return result
}

const filteredItemList = computed(() => {
    if (!search.value) return itemList.value
    else return filterComponentByName(search.value)
})
</script>

<template>
    <div :class="[$style.root, storiesNavIsOpen && $style['root--open']]">
        <div :class="$style.home">
            <NuxtLink :to="storiesPath('/')" :class="$style.title"> Stories</NuxtLink>
        </div>
        <div :class="$style.search">
            <input v-model="search" type="text" :class="$style.search__input" />
            <button :class="$style.search__clear" @click="search = ''" />
        </div>
        <StoriesNavItem v-for="(item, key) in filteredItemList" :key="key" :item="item" :label="key" open />
    </div>
</template>

<style module lang="scss">
.root {
    position: fixed;
    z-index: 1000;
    top: 0;
    display: none;
    width: 100%;
    height: 100vh;
    flex-shrink: 0;
    padding: 0 20px 40px;
    border-right: 1px solid #e3e3e3ff;
    background-color: #f6f6f6ff;
    font-size: 14px;
    overflow-y: auto;

    @media (min-width: 768px) {
        position: sticky;
        overflow: auto;
        width: 17vw;
        min-width: 150px;
        max-width: 400px;
        resize: horizontal;
    }

    &--open {
        display: block;
    }
}

.home {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    padding-top: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e3e3e3ff;
    margin-bottom: 1em;
    background-color: inherit;
}

.title {
    font-size: 1.3rem;
    text-decoration: none;
    color: inherit;
}

.toggle {
    margin-left: auto;

    @media (min-width: 768px) {
        display: none;
    }
}

.search {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: 6px;
    margin-bottom: 16px !important;
    background-color: rgba(black, 0.04);
}

.search__input {
    width: 90%;
    border: none;
    background-color: transparent;
    padding: 0.5em 0.2rem;
}

.search__clear {
    all: unset;
    position: absolute;
    right: 10px;
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
</style>
