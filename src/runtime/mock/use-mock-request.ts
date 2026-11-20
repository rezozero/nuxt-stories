import { getCurrentScope, onScopeDispose } from 'vue'
import { useNuxtApp } from '#app'
import { addMockHandlers, type MockHandler } from './worker'

// Server: handler groups of each render, keyed by the request's Nuxt app and dropped with it
const renderGroups = new WeakMap<object, MockHandler[][]>()

export function getRenderMockGroups(nuxtApp: object): MockHandler[][] {
    let groups = renderGroups.get(nuxtApp)
    if (!groups) renderGroups.set(nuxtApp, (groups = []))
    return groups
}

/**
 * Mock network requests for the current story with MSW handlers.
 *
 * - Client: handlers are active while the calling component is mounted and removed when it is
 *   unmounted (story change, hot reload).
 * - Server: handlers are active for the current render only. Only absolute URLs are mocked:
 *   relative `$fetch('/api/…')` calls are served by Nitro directly, without a network request.
 *
 * @example
 * useMockRequest(http.get('*\/items', () => HttpResponse.json([])))
 */
export function useMockRequest(...handlers: MockHandler[]): void {
    if (!handlers.length) return

    if (import.meta.server) {
        getRenderMockGroups(useNuxtApp()).push([...handlers])
        return
    }

    const remove = addMockHandlers(handlers)

    if (getCurrentScope()) {
        onScopeDispose(remove)
    } else if (import.meta.dev) {
        console.warn(
            '[nuxt-stories] useMockRequest() called outside a component setup: handlers will never be removed.',
        )
    }
}
