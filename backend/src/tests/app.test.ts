import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { AddressInfo } from 'node:net'
import { createApp } from '../app.js'
import type { VisitorAnalyticsService } from '../services/visitorAnalytics.js'

const calls = { track: 0, heartbeat: 0, requestedDays: 0 }

const service: VisitorAnalyticsService = {
  async trackView() {
    calls.track += 1
  },
  async heartbeat() {
    calls.heartbeat += 1
  },
  async getStats(days) {
    calls.requestedDays = days
    return {
      active_viewers: 2,
      total_views: 8,
      unique_visitors: 5,
      daily: [{ date: '2026-11-17', views: 8, unique_visitors: 5 }],
    }
  },
}

const app = createApp(service, 'http://localhost:5173')
let baseUrl: string
let server: ReturnType<typeof app.listen>

before(async () => {
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`
})

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

describe('public analytics API', () => {
  it('returns only aggregate analytics and accepts a bounded range', async () => {
    const response = await fetch(`${baseUrl}/api/analytics/stats?days=14`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), {
      active_viewers: 2,
      total_views: 8,
      unique_visitors: 5,
      daily: [{ date: '2026-11-17', views: 8, unique_visitors: 5 }],
    })
    assert.equal(calls.requestedDays, 14)
  })

  it('rejects invalid tracking input without touching the service', async () => {
    const response = await fetch(`${baseUrl}/api/analytics/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: 'not-a-uuid', sessionId: 'not-a-uuid', route: '/home' }),
    })
    assert.equal(response.status, 400)
    assert.equal(calls.track, 0)
  })

  it('records a valid route view and heartbeat', async () => {
    const visitorId = 'c0a80101-0000-4000-8000-000000000001'
    const sessionId = 'c0a80101-0000-4000-8000-000000000002'
    const view = await fetch(`${baseUrl}/api/analytics/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, sessionId, route: '/visitors' }),
    })
    const heartbeat = await fetch(`${baseUrl}/api/analytics/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, sessionId }),
    })
    assert.equal(view.status, 204)
    assert.equal(heartbeat.status, 204)
    assert.equal(calls.track, 1)
    assert.equal(calls.heartbeat, 1)
  })

  it('does not expose the removed GitHub integration endpoints', async () => {
    for (const [path, method] of [
      ['/api/github/status', 'GET'],
      ['/api/github/install', 'GET'],
      ['/api/github/callback', 'GET'],
      ['/api/github/repositories', 'GET'],
      ['/api/github/disconnect', 'POST'],
    ] as const) {
      const response = await fetch(`${baseUrl}${path}`, { method })
      assert.equal(response.status, 404, `${method} ${path} should be unavailable`)
    }
  })
})
