<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Preset {
    label: string
    width: number | null
    height: number | null
}

const PRESETS: Preset[] = [
    { label: '375', width: 375, height: 667 },
    { label: '768', width: 768, height: 1024 },
    { label: '1280', width: 1280, height: 800 },
    { label: '100%', width: null, height: null },
]

defineProps<{
    iframeSrc: string
}>()

const emit = defineEmits<{
    'update:viewportStyle': [style: { width: string; height: string }]
}>()

const viewportWidth = ref<number | null>(null)
const viewportHeight = ref<number | null>(null)

const viewportStyle = computed(() => ({
    width: viewportWidth.value ? `${viewportWidth.value}px` : '100%',
    height: viewportHeight.value ? `${viewportHeight.value}px` : '100%',
}))

watch(viewportStyle, (style) => emit('update:viewportStyle', style))

function applyPreset(preset: Preset) {
    viewportWidth.value = preset.width
    viewportHeight.value = preset.height
}

function swapDimensions() {
    const tmp = viewportWidth.value
    viewportWidth.value = viewportHeight.value
    viewportHeight.value = tmp
}

const presetMenuRef = ref()

function togglePresetMenu(event: Event) {
    presetMenuRef.value?.toggle(event)
}

const presetMenuModel = computed(() =>
    PRESETS.map((preset) => ({
        label: preset.label,
        icon:
            viewportWidth.value === preset.width && viewportHeight.value === preset.height ? 'pi pi-check' : undefined,
        command: () => applyPreset(preset),
    })),
)
</script>

<template>
    <PvToolbar>
        <template #start>
            <div class="stories-button-group">
                <PvButton
                    icon="pi pi-desktop"
                    severity="secondary"
                    aria-haspopup="true"
                    aria-controls="preset-menu"
                    @click="togglePresetMenu"
                />
                <PvMenu id="preset-menu" ref="presetMenuRef" :model="presetMenuModel" popup class="stories-menu" />
                <PvButton
                    v-if="viewportWidth !== null"
                    icon="pi pi-arrow-right-arrow-left"
                    severity="secondary"
                    title="Swap dimensions"
                    @click="swapDimensions"
                />
                <span v-if="viewportWidth !== null" class="stories-page__toolbar__size">
                    {{ viewportWidth }} × {{ viewportHeight }}
                </span>
            </div>
        </template>
        <template #end>
            <PvButton
                as="a"
                icon="pi pi-external-link"
                severity="secondary"
                :href="iframeSrc"
                label="Open the story"
                target="_blank"
                rel="noopener"
            />
        </template>
    </PvToolbar>
</template>

<style lang="scss">
.stories-button-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
</style>
