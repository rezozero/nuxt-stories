<script setup lang="ts">
import type { PropType } from 'vue'
import { computed, ref, watchEffect, watch } from 'vue'
import { NuxtLink } from '#components'
import { useRoute } from 'vue-router'

export interface ItemLink {
    to: string
    label: string
}

export type NavItem = {
    [key: string]: NavItem | ItemLink
}

const props = defineProps({
    item: {
        type: Object as PropType<NavItem | ItemLink>,
        required: true,
    },
    label: {
        type: [String, Number],
        default: '',
    },
    open: Boolean,
})

const route = useRoute()

const link = ref<HTMLAnchorElement | null>(null)
const folder = ref<HTMLDivElement | null>(null)

const isLink = computed(() => typeof props.item.to === 'string')

// const hasChildren = computed(() => !isLink.value && Object.keys(props.item).length > 0)

function getLinkValues(obj: Object & { to?: string }) {
    return Object.entries(obj).reduce((acc: string[], [key, value]) => {
        if (isLink.value) return acc

        if (typeof value === 'object') {
            acc.push(...getLinkValues(value))
        } else if (key === 'to' && typeof value === 'string') {
            acc.push(value)
        }
        return acc
    }, [])
}

const linkValues = computed(() => getLinkValues(props.item))

const hasActiveParentRoute = computed(() => {
    return linkValues.value.includes(route.path)
})

const isOpen = ref(props.open || hasActiveParentRoute.value)

watchEffect(() => {
    if (hasActiveParentRoute.value) isOpen.value = true
})

watch(isOpen, () => {
    if (isOpen.value) {
        ;(link.value || folder.value)?.scrollIntoView({ block: 'nearest' })
    }
})
</script>

<template>
    <NuxtLink v-if="isLink" ref="link" :to="item.to" class="stories-nav-item__link">
        {{ item.label }}
    </NuxtLink>
    <div v-else ref="folder" :class="['stories-nav-item__folder', isOpen && 'stories-nav-item__folder--open']">
        <button class="stories-nav-item__folder__button" @click="isOpen = !isOpen">
            <span>{{ label }}</span>
            <span class="stories-nav-item__folder__icon"></span>
        </button>
        <ul v-if="isOpen">
            <li v-for="(childItem, key) in item" :key="key">
                <StoriesNavItem :item="childItem" :label="key" />
            </li>
        </ul>
    </div>
</template>

<style lang="scss">
.stories-nav-item__link {
    margin-block: 0.1rem;
    padding: 0.15rem 0.3rem;
    text-decoration: none;
    color: inherit;
    border-radius: 0.3rem;

    &.router-link-exact-active {
        background-color: yellow;
    }
}

.stories-nav-item__folder__button {
    display: flex;
    align-items: center;
    margin-block: 0.8rem 0.5rem;
    padding: 0.15rem 0.3rem;
    white-space: nowrap;
    background-color: transparent;
    border: none;
}

.stories-nav-item__folder__icon {
    position: relative;
    display: inline-flex;
    width: 1.2rem;
    height: 1.2rem;
    align-items: center;
    justify-content: center;
    margin-left: 0.5rem;
    border-radius: 100%;
    background-color: #e4e4e4;
    font-size: 0.8rem;

    &::before,
    &::after {
        position: absolute;
        top: 50%;
        left: 50%;
        display: block;
        background-color: currentColor;
        content: '';
        flex-shrink: 0;
    }

    &::before {
        width: 8px;
        height: 2px;
        margin-top: -1px;
        margin-left: -4px;
    }

    &::after {
        width: 2px;
        height: 8px;
        margin-top: -4px;
        margin-left: -1px;
    }

    .stories-nav-item__folder--open &::after {
        display: none;
    }
}

.stories-nav-item__folder ul {
    padding-left: 1em;
    margin-block: 0;
    margin-left: 1em;
    line-height: 1.5em;
    list-style-type: dot;
}
</style>
