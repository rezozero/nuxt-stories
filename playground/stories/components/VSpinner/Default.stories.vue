<template>
    <NuxtStory>
        <VSpinner :class="$style.root" />
        <template #aside>
            <h2>Settings</h2>
            <button>ok</button>
        </template>
    </NuxtStory>
</template>

<style lang="scss" module>
.root {
    width: 200px;
    height: 200px;
}
</style>
