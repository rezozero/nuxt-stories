<script setup lang="ts">
import type { ControlSchema } from '../composables/use-story-controls'

defineProps<{
    schema: ControlSchema
    values: Record<string, string>
}>()

const emit = defineEmits<{
    change: [key: string, value: string]
}>()
</script>

<template>
    <div class="story-controls-panel">
        <h3 class="story-controls-panel__title">Controls</h3>
        <div v-for="(def, key) in schema" :key="key" class="story-controls-panel__row">
            <label class="story-controls-panel__label">{{ key }}</label>

            <!-- text -->
            <input
                v-if="def.type === 'text'"
                type="text"
                :value="values[key] ?? def.default"
                class="story-controls-panel__input"
                @input="emit('change', String(key), ($event.target as HTMLInputElement).value)"
            />

            <!-- number -->
            <input
                v-else-if="def.type === 'number'"
                type="number"
                :value="values[key] ?? def.default"
                class="story-controls-panel__input"
                @input="emit('change', String(key), ($event.target as HTMLInputElement).value)"
            />

            <!-- color -->
            <input
                v-else-if="def.type === 'color'"
                type="color"
                :value="values[key] ?? def.default"
                class="story-controls-panel__input"
                @input="emit('change', String(key), ($event.target as HTMLInputElement).value)"
            />

            <!-- range -->
            <div v-else-if="def.type === 'range'" class="story-controls-panel__range">
                <input
                    type="range"
                    :min="def.min"
                    :max="def.max"
                    :step="def.step ?? 1"
                    :value="values[key] ?? def.default"
                    class="story-controls-panel__input"
                    @input="emit('change', String(key), ($event.target as HTMLInputElement).value)"
                />
                <span class="story-controls-panel__range-value">
                    {{ values[key] ?? def.default }}
                </span>
            </div>

            <!-- boolean -->
            <input
                v-else-if="def.type === 'boolean'"
                type="checkbox"
                :checked="(values[key] ?? String(def.default)) === 'true'"
                class="story-controls-panel__input"
                @change="emit('change', String(key), String(($event.target as HTMLInputElement).checked))"
            />

            <!-- select -->
            <select
                v-else-if="def.type === 'select'"
                :value="values[key] ?? def.default"
                class="story-controls-panel__input"
                @change="emit('change', String(key), ($event.target as HTMLSelectElement).value)"
            >
                <option v-for="opt in def.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <!-- object (JSON textarea) -->
            <textarea
                v-else-if="def.type === 'object'"
                :value="values[key] ?? JSON.stringify(def.default)"
                class="story-controls-panel__input story-controls-panel__input--textarea"
                @input="emit('change', String(key), ($event.target as HTMLTextAreaElement).value)"
            />
        </div>
    </div>
</template>

<style lang="scss">
.story-controls-panel {
    overflow-y: auto;
    padding: 1.5rem;
    border-left: 1px solid #e3e3e3ff;
    background-color: #f6f6f6ff;
    font-family: Helvetica, sans-serif;
    font-size: 13px;
    flex-shrink: 0;
    min-width: 200px;
    max-width: 320px;
    width: 17vw;

    @media (max-width: 767px) {
        max-width: 100%;
        width: 100%;
        max-height: 33vh;
        border-left: none;
        border-top: 1px solid #e3e3e3ff;
    }
}

.story-controls-panel__title {
    margin: 0 0 1rem;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #888;
}

.story-controls-panel__row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
}

.story-controls-panel__label {
    font-weight: 500;
    color: #444;
    font-size: 12px;
}

.story-controls-panel__input {
    width: 100%;
    padding: 0.3rem 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
    background-color: #fff;
    box-sizing: border-box;

    &[type='checkbox'] {
        width: auto;
        padding: 0;
    }

    &[type='range'] {
        padding: 0;
        border: none;
        background: none;
    }

    &[type='color'] {
        padding: 0.1rem;
        height: 2rem;
    }

    &--textarea {
        resize: vertical;
        min-height: 5rem;
        font-family: monospace;
    }
}

.story-controls-panel__range {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .story-controls-panel__input {
        flex: 1;
    }
}

.story-controls-panel__range-value {
    min-width: 2.5rem;
    text-align: right;
    color: #555;
}
</style>
