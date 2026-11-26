import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { AddressInfo } from 'node:net'
import { createApp } from '../app.js'
import type { GitHubAppIntegration } from '../services/githubApp.js'
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
const githubApp: GitHubAppIntegration = {
  appSlug: 'codeguard-readonly',
  createInstallationSession(installationId) {
    return `${installationId}.valid`
  },
  getInstallationId(session) {
    const match = /^(\d+)\.valid$/.exec(session ?? '')
    return match ? Number(match[1]) : null
  },
  async listRepositories(installationId) {
    return {
      totalCount: 1,
      repositories: [
        {
          id: installationId,
          name: 'code_guard_ai_',
          full_name: 'pallaviv-18/code_guard_ai_',
          private: true,
          html_url: 'https://github.com/pallaviv-18/code_guard_ai_',
          description: null,
          default_branch: 'main',
          language: 'TypeScript',
        },
      ],
    }
  },
}
const githubAppTestServer = createApp(service, 'http://localhost:5173', githubApp)
let githubBaseUrl: string
let githubServer: ReturnType<typeof githubAppTestServer.listen>

before(async () => {
  server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${address.port}`

  githubServer = githubAppTestServer.listen(0)
  await new Promise<void>((resolve) => githubServer.once('listening', resolve))
  const githubAddress = githubServer.address() as AddressInfo
  githubBaseUrl = `http://127.0.0.1:${githubAddress.port}`
})

after(async () => {
  await Promise.all(
    [server, githubServer].map(
      (activeServer) =>
        new Promise<void>((resolve, reject) => {
          activeServer.close((error) => (error ? reject(error) : resolve()))
        }),
    ),
  )
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

  it('reports the GitHub App as not configured until credentials are provided', async () => {
    const response = await fetch(`${baseUrl}/api/github/status`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { configured: false, connected: false })
  })
})

describe('GitHub App installation API', () => {
  it('validates installation state and lists only the signed installation', async () => {
    const install = await fetch(`${githubBaseUrl}/api/github/install`, { redirect: 'manual' })
    assert.equal(install.status, 302)

    const installUrl = new URL(install.headers.get('location') ?? '')
    assert.equal(installUrl.origin, 'https://github.com')
    assert.equal(installUrl.pathname, '/apps/codeguard-readonly/installations/new')
    const state = installUrl.searchParams.get('state')
    const stateCookie = install.headers.get('set-cookie')?.match(/codeguard_github_state=([^;]+)/)?.[0]
    assert.ok(state)
    assert.ok(stateCookie)

    const invalidCallback = await fetch(
      `${githubBaseUrl}/api/github/callback?setup_action=install&installation_id=123&state=invalid`,
      { headers: { Cookie: stateCookie }, redirect: 'manual' },
    )
    assert.equal(invalidCallback.status, 302)
    assert.equal(
      new URL(invalidCallback.headers.get('location') ?? '').searchParams.get('github_error'),
      'invalid_callback',
    )

    const callback = await fetch(
      `${githubBaseUrl}/api/github/callback?setup_action=install&installation_id=123&state=${state}`,
      { headers: { Cookie: stateCookie }, redirect: 'manual' },
    )
    assert.equal(callback.status, 302)
    assert.equal(
      new URL(callback.headers.get('location') ?? '').searchParams.get('github'),
      'connected',
    )
    const sessionCookie = callback.headers
      .get('set-cookie')
      ?.match(/codeguard_github_installation=([^;]+)/)?.[0]
    assert.ok(sessionCookie)

    const repositories = await fetch(`${githubBaseUrl}/api/github/repositories?page=1`, {
      headers: { Cookie: sessionCookie },
    })
    assert.equal(repositories.status, 200)
    assert.deepEqual(await repositories.json(), {
      totalCount: 1,
      repositories: [
        {
          id: 123,
          name: 'code_guard_ai_',
          full_name: 'pallaviv-18/code_guard_ai_',
          private: true,
          html_url: 'https://github.com/pallaviv-18/code_guard_ai_',
          description: null,
          default_branch: 'main',
          language: 'TypeScript',
        },
      ],
    })

    const disconnected = await fetch(`${githubBaseUrl}/api/github/disconnect`, {
      method: 'POST',
      headers: { Cookie: sessionCookie },
    })
    assert.equal(disconnected.status, 204)
  })
})
