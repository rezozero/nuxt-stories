<script setup lang="ts">
defineOptions({
    inheritAttrs: false,
})

withDefaults(
    defineProps<{
        layout?: 'defaultTest' | 'fullscreen' | 'default'
    }>(),
    {
        layout: 'defaultTest',
    },
)

const settingIsOpen = ref(true)
</script>

<template>
    <div v-if="$slots.settings" :class="$style.setting">
        <button :class="$style.title" @click="() => (settingIsOpen = !settingIsOpen)">
            Component settings
            <span> [{{ settingIsOpen ? '−' : '+' }}]</span>
        </button>
        <div v-show="settingIsOpen" :class="$style.content">
            <slot name="settings" />
        </div>
    </div>
    <div :class="[$style.root, $style['root--layout-' + layout]]" v-bind="$attrs">
        <slot />
    </div>
</template>

<style lang="scss" module>
.root {
    padding: rem(20) var(--gutter);

    &--layout-fullscreen {
        padding: 0;
    }
}

.setting {
    position: sticky;
    z-index: 2;
    top: 0;
    padding: rem(20) rem(40) rem(15);
    border-top: 1px solid #e3e3e3;
    border-bottom: 1px solid #e3e3e3;
    background-color: #f1f1f1;
    font-size: rem(14);
}

.title {
    min-height: rem(20);
}

.content {
    display: flex;
    flex-wrap: wrap;
    margin-top: rem(20);
    gap: rem(40);
}

.input {
    border: 1px solid rgba(#000, 0.2);

    &:focus {
        outline: none;
    }
}
</style>
