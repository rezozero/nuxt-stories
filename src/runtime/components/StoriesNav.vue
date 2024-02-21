<script setup lang="ts">
import type { RouteRecordRaw } from 'vue-router'
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStories } from '../composables/use-stories'
import StoriesNavItem, { type NavItem } from './StoriesNavItem.vue'

const { storiesPath, storiesUIVisible } = useStories()
const route = useRoute()

// ITEM LIST
const childRoutes = computed(() => {
    return route.matched[0]?.children
})

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

// SEARCH
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

function onKeyUp(event: KeyboardEvent) {
    if (event.key === 'Escape') search.value = ''
}

onMounted(() => {
    window.addEventListener('keyup', onKeyUp)
})

onBeforeUnmount(() => {
    window.removeEventListener('keyup', onKeyUp)
})

// OPEN/CLOSE
const isOpen = ref(false)

watch(route, () => {
    isOpen.value = false
})
</script>

<template>
    <div v-show="storiesUIVisible" :class="[$style.root, isOpen && $style['root--open']]">
        <div :class="$style.top">
            <NuxtLink :to="storiesPath('/')" :class="$style.title"> Stories</NuxtLink>
            <button :class="$style.toggle" @click="isOpen = !isOpen"></button>
        </div>
        <div :class="$style.main">
            <div :class="$style.search">
                <input v-model="search" type="text" :class="$style.search__input" />
                <button :class="$style.search__clear" @click="search = ''" />
            </div>
            <StoriesNavItem v-for="(item, key) in filteredItemList" :key="key" :item="item" :label="key" />
        </div>
    </div>
</template>

<style module lang="scss">
.root {
    position: sticky;
    z-index: 1000;
    top: 0;
    width: 100%;
    flex-shrink: 0;
    border-right: 1px solid #e3e3e3ff;
    background-color: #f6f6f6ff;
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

.top {
    position: sticky;
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

.title {
    font-size: 1.3rem;
    text-decoration: none;
    color: inherit;
}

.toggle {
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

    .root--open &::before {
        transform: translateY(2px) rotate(45deg);
    }

    .root--open &::after {
        transform: translateY(-2px) rotate(-45deg);
    }
}

.main {
    display: none;
    margin-top: 1em;
    padding: 1rem 1rem 2rem;

    @media (min-width: 768px) {
        display: block;
        padding-inline: 0;
    }

    .root--open & {
        display: block;
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
