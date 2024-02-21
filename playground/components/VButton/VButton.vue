<script setup lang="ts">
defineProps({
    big: Boolean,
})
</script>

<template>
    <button :class="[$style.root, big && $style['root--big']]">
        <slot />
    </button>
</template>

<style module lang="scss">
.root {
    padding: 0.6rem;
    background-color: grey;
    border-radius: 4px;
    color: #fff;

    &--big {
        padding: 1.2rem;
    }
}
</style>
