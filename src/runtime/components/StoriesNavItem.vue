<script setup lang="ts">
import type { PropType } from 'vue'
import { NuxtLink } from '#components'
import { computed, ref } from 'vue'
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

const isOpen = ref(props.open)

const isLink = computed(() => typeof props.item.to === 'string')

// const hasChildren = computed(() => !isLink.value && Object.keys(props.item).length > 0)
const route = useRoute()

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

const isActiveParentRoute = computed(() => {
  return getLinkValues(props.item).includes(route.path)
})
</script>

<template>
  <NuxtLink v-if="isLink" :to="item.to" :class="$style.link">
    {{ item.label }}
  </NuxtLink>
  <div v-else :class="[$style.folder, isActiveParentRoute && $style['folder--active']]">
    <button :class="$style.label"
@click="isOpen = !isOpen">
      <span>{{ label }}</span>
      <span :class="$style.icon">{{ isOpen ? '−' : '+' }}</span>
    </button>
    <ul v-if="isOpen">
      <li v-for="(childItem, key) in item" :key="key">
        <StoriesNavItem :item="childItem" :label="key" />
      </li>
    </ul>
  </div>
</template>

<style module lang="scss">
.link {
  padding: 0.15rem 0.3rem;
  text-decoration: none;
  color: inherit;
  border-radius: 0.3rem;
  margin-bottom: 0.1rem;

  &:global(.router-link-exact-active) {
    background-color: yellow;
  }
}

.label {
  margin-bottom: 0.5em;
  white-space: nowrap;

  .folder--active & {
    font-weight: bold;
  }
}

.icon {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  margin-left: 0.5rem;
  border-radius: 100%;
  background-color: #e4e4e4;
}

.folder ul {
  padding-left: 1em;
  margin-bottom: 0.5em;
  margin-left: 1em;
  line-height: 1.5em;
  list-style-type: dot;
}
</style>
