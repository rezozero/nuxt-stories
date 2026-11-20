import { AsyncLocalStorage } from 'node:async_hooks'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startMockServer, stopMockServer } from '../src/runtime/mock/server'
import type { MockHandler } from '../src/runtime/mock/worker'

// Stands in for the per-render Nuxt app context
const render = new AsyncLocalStorage<MockHandler[][]>()

const url = 'https://api.example.test/items'

function itemsHandler(title: string) {
    return http.get(url, () => HttpResponse.json({ title }))
}

describe('mock server', () => {
    beforeAll(() => startMockServer(() => render.getStore()))
    afterAll(() => stopMockServer())

    it('answers requests with the handlers of the current render', async () => {
        const body = await render.run([[itemsHandler('mocked')]], async () => (await fetch(url)).json())

        expect(body).toEqual({ title: 'mocked' })
    })

    it('keeps the mocks of concurrent renders apart', async () => {
        const renderWith = (title: string, delay: number) =>
            render.run([[itemsHandler(title)]], async () => {
                await new Promise((resolve) => setTimeout(resolve, delay))
                return (await fetch(url)).json()
            })

        const bodies = await Promise.all([renderWith('first', 20), renderWith('second', 0)])

        expect(bodies).toEqual([{ title: 'first' }, { title: 'second' }])
    })

    it('gives precedence to the latest handler group of a render', async () => {
        const body = await render.run([[itemsHandler('older')], [itemsHandler('latest')]], async () =>
            (await fetch(url)).json(),
        )

        expect(body).toEqual({ title: 'latest' })
    })

    it('lets requests made outside a render reach the network', async () => {
        const network: Server = createServer((_request, response) => response.end('network'))
        await new Promise<void>((resolve) => network.listen(0, '127.0.0.1', resolve))
        const networkUrl = `http://127.0.0.1:${(network.address() as AddressInfo).port}/items`

        try {
            await render.run([[http.get(networkUrl, () => HttpResponse.text('mocked'))]], async () => {})
            expect(await (await fetch(networkUrl)).text()).toBe('network')
        } finally {
            network.close()
        }
    })
})
