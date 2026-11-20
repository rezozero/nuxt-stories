import { getCurrentScope, onScopeDispose } from 'vue'
import { addMockHandlers, type MockHandler } from './worker'

/**
 * Mock network requests for the current story with MSW handlers.
 * Handlers are active while the calling component is mounted and removed when it is
 * unmounted (story change, hot reload). Client only: no-op on the server.
 *
 * @example
 * useMockRequest(http.get('*\/items', () => HttpResponse.json([])))
 */
export function useMockRequest(...handlers: MockHandler[]): void {
    if (import.meta.server || !handlers.length) return

    const remove = addMockHandlers(handlers)

    if (getCurrentScope()) {
        onScopeDispose(remove)
    } else if (import.meta.dev) {
        console.warn(
            '[nuxt-stories] useMockRequest() called outside a component setup: handlers will never be removed.',
        )
    }
}
