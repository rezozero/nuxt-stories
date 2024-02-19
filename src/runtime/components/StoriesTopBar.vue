<template>
    <div :class="$style.root">
        <StoriesNavToggle :class="$style.toggle" />
    </div>
</template>

<style module lang="scss">
.root {
    display: flex;
    width: 100%;
    height: rem(56);
    align-items: center;
    background-color: #f6f6f6ff;
}

.toggle {
    margin-left: rem(10);
}
</style>
