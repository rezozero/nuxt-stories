<template>
  <VStory>
    <VSpinner
      play-state="paused"
      :class="$style.root"
    />
  </VStory>
</template>

<style lang="scss" module>
.root {
    width: 200px;
    height: 200px;
}
</style>
