import type { SetupWorker } from 'msw/browser'

export type MockHandler = Parameters<SetupWorker['use']>[number]

interface MockWorkerState {
    worker?: SetupWorker
    ready?: Promise<SetupWorker>
    // Handler groups in registration order, one group per useMockRequest() call
    groups: Set<MockHandler[]>
}

// Kept on globalThis so a hot-reloaded copy of this module reuses the running worker
const STATE_KEY = '__nuxtStoriesMockWorker'
const globalState = globalThis as typeof globalThis & { [STATE_KEY]?: MockWorkerState }
const state: MockWorkerState = (globalState[STATE_KEY] ||= { groups: new Set() })

function syncHandlers() {
    const worker = state.worker
    if (!worker) return

    // Drop every runtime handler, then re-add the remaining groups in order:
    // worker.use() prepends, so the latest group keeps precedence.
    worker.resetHandlers()
    for (const group of state.groups) worker.use(...group)
}

/**
 * Start the MSW worker once. Concurrent and later calls share the same promise.
 */
export function startMockWorker(url: string): Promise<SetupWorker> {
    state.ready ||= import('msw/browser').then(async ({ setupWorker }) => {
        const worker = setupWorker()

        await worker.start({
            serviceWorker: { url },
            onUnhandledRequest: 'bypass',
            quiet: true,
        })

        state.worker = worker
        // Handlers registered before the worker was ready
        syncHandlers()

        return worker
    })

    return state.ready
}

/**
 * Register a group of handlers and return a function that removes it.
 */
export function addMockHandlers(handlers: MockHandler[]): () => void {
    // Copy so the same array passed twice still counts as two groups
    const group = [...handlers]

    state.groups.add(group)
    state.worker?.use(...group)

    return () => {
        if (state.groups.delete(group)) syncHandlers()
    }
}
