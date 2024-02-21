<template>
    <NuxtStory>
        <VSpinner play-state="paused" :class="$style.root" />
    </NuxtStory>
</template>

<style lang="scss" module>
.root {
    width: 200px;
    height: 200px;
}
</style>
