<template>
    <NuxtStory>
        <p :class="$style.h1">text h1</p>
        <p :class="$style.h2">text h2</p>
    </NuxtStory>
</template>

<style lang="scss" module>
.h1 {
  font-size: 3rem;
}

.h2 {
  font-size: 2rem;
}
</style>
