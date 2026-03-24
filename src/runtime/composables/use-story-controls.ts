import { reactive, onMounted, watchEffect } from 'vue'
import { useRoute, onBeforeRouteLeave } from '#imports'

export type ControlDef =
    | { type: 'text'; default: string }
    | { type: 'number'; default: number }
    | { type: 'boolean'; default: boolean }
    | { type: 'select'; options: string[]; default: string }
    | { type: 'color'; default: string }
    | { type: 'range'; min: number; max: number; step?: number; default: number }
    | { type: 'object'; default: object }

export type ControlSchema = Record<string, ControlDef>

type CoercedValues<T extends ControlSchema> = {
    [K in keyof T]: T[K] extends { type: 'boolean' }
        ? boolean
        : T[K] extends { type: 'number' | 'range' }
          ? number
          : T[K] extends { type: 'object' }
            ? object
            : string
}

function coerce(value: unknown, type: ControlDef['type']): unknown {
    if (value === undefined || value === null || value === '') return undefined
    switch (type) {
        case 'number':
        case 'range':
            return Number(value)
        case 'boolean':
            return value === 'true' || value === true
        case 'object':
            try {
                return JSON.parse(String(value))
            } catch {
                return {}
            }
        default:
            return String(value)
    }
}

/**
 * Define interactive controls for a story. Values are read from the URL query
 * string and kept in sync reactively. The shell panel is driven by postMessage.
 *
 * @example
 * const controls = useStoryControls({
 *   label:    { type: 'text',    default: 'Click me' },
 *   disabled: { type: 'boolean', default: false },
 *   size:     { type: 'range',   min: 12, max: 32, default: 16 },
 * })
 */
export function useStoryControls<T extends ControlSchema>(schema: T): CoercedValues<T> {
    const route = useRoute()

    // Initialise reactive object with defaults
    const values = reactive(
        Object.fromEntries(Object.entries(schema).map(([key, def]) => [key, def.default])),
    ) as CoercedValues<T>

    // Keep values in sync with route.query (reactive, tracked by watchEffect)
    watchEffect(() => {
        for (const [key, def] of Object.entries(schema)) {
            const raw = key in route.query ? route.query[key] : def.default
            ;(values as Record<string, unknown>)[key] = coerce(raw, def.type) ?? def.default
        }
    })

    if (import.meta.client) {
        // Broadcast schema to the parent shell so it can render the controls panel
        onMounted(() => {
            if (window.parent !== window) {
                window.parent.postMessage(
                    { source: 'nuxt-stories-frame', type: 'CONTROLS_SCHEMA', schema },
                    window.location.origin,
                )
            }
        })

        // Tell the shell to clear the panel when navigating away
        onBeforeRouteLeave(() => {
            if (window.parent !== window) {
                window.parent.postMessage(
                    { source: 'nuxt-stories-frame', type: 'CONTROLS_CLEAR' },
                    window.location.origin,
                )
            }
        })
    }

    return values
}
