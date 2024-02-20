<script lang="ts" setup>
import { useSlots, computed, ref } from 'vue'

type VStorySectionProps = {
    title?: string
    contentClass?: string
}
defineProps<VStorySectionProps>()

const slots = useSlots()
const hasInfo = computed(() => slots.info)

const tooltipDisplayed = ref(false)
const toggle = () => (tooltipDisplayed.value = !tooltipDisplayed.value)
</script>

<template>
  <div :class="$style.root">
    <div
      v-if="title || hasInfo"
      :class="$style.head"
    >
      <h2 :class="$style.title">
        {{ title }}
      </h2>
      <div :class="$style.tooltip">
        <button
          v-if="hasInfo"
          :class="$style.tooltip__button"
          class="text-body-xs"
          @click="toggle"
        >
          i
        </button>
        <div
          v-if="hasInfo && tooltipDisplayed"
          class="text-body-xs"
          :class="$style.tooltip__content"
        >
          <slot name="info" />
        </div>
      </div>
    </div>
    <div :class="[$style.content, contentClass]">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" module>
.root {
    padding-block: 30px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);

    div[data-backspace] {
        flex-basis: 100%;
    }
}

.head {
    position: relative;
    flex-basis: 100%;
    margin-bottom: 10px;
    z-index: 10;
}

.title {
    text-decoration: underline;
    display: inline;
}

.tooltip {
    display: inline;
    margin-left: 6px;
}

.tooltip__button {
    display: inline-flex;
    width: 18px;
    height: 18px;
    align-items: center;
    justify-content: center;
    border-radius: 50vmax;
    background-color: rgba(0, 0, 0, 0.1);
}

.tooltip__content {
    position: absolute;
    background-color: rgb(241, 241, 241);
    padding: 15px 20px;
    max-width: 56ch;
    top: calc(100% + 10px);
}

.content {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    padding: 20px 12px;
    gap: 10px 40px;
}
</style>
