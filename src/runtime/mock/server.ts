import type { SetupServer } from 'msw/node'
import type { MockHandler } from './worker'

/**
 * Returns the handler groups of the render being processed, in registration order.
 */
export type MockGroupsResolver = () => MockHandler[][] | undefined

interface MockServerState {
    ready?: Promise<SetupServer>
    // Replaced on each start: after a hot reload it points at the current module copies
    resolveGroups?: MockGroupsResolver
}

// Kept on globalThis: the Nitro process is shared, a single interceptor must be installed
const STATE_KEY = '__nuxtStoriesMockServer'
const globalState = globalThis as typeof globalThis & { [STATE_KEY]?: MockServerState }
const state: MockServerState = (globalState[STATE_KEY] ||= {})

/**
 * Intercept `fetch`/`http` in the server process once. A single catch-all handler forwards
 * each request to the handlers of the current render, so concurrent renders never see each
 * other's mocks. Requests made outside a render, or unmatched, go to the network.
 */
export function startMockServer(resolveGroups: MockGroupsResolver): Promise<SetupServer> {
    state.resolveGroups = resolveGroups

    return (state.ready ||= Promise.all([import('msw'), import('msw/node')]).then(
        ([{ http, getResponse }, { setupServer }]) => {
            const server = setupServer(
                http.all('*', async ({ request }) => {
                    const groups = state.resolveGroups?.()
                    if (!groups?.length) return

                    // Latest group first, so it keeps precedence like worker.use()
                    const handlers = groups.toReversed().flat()

                    return getResponse(handlers as Parameters<typeof getResponse>[0], request)
                }),
            )

            server.listen({ onUnhandledRequest: 'bypass' })
            return server
        },
    ))
}

export async function stopMockServer(): Promise<void> {
    const server = await state.ready
    server?.close()
    state.ready = undefined
}
