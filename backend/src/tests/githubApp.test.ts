import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { describe, it } from 'node:test'
import { createGitHubAppIntegration } from '../services/githubApp.js'

describe('GitHub App service', () => {
  it('signs installation sessions and uses short-lived installation tokens', async () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    })
    const requests: Array<{ url: URL; authorization: string | null }> = []
    const fetcher: typeof fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input.toString())
      const authorization = new Headers(init?.headers).get('Authorization')
      requests.push({ url, authorization })

      const body =
        url.pathname === '/app/installations/456/access_tokens'
          ? { token: 'short-lived-installation-token' }
          : {
              total_count: 1,
              repositories: [
                {
                  id: 789,
                  name: 'selected-repository',
                  full_name: 'owner/selected-repository',
                  private: true,
                  html_url: 'https://github.com/owner/selected-repository',
                  description: null,
                  default_branch: 'main',
                  language: 'TypeScript',
                },
              ],
            }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const integration = createGitHubAppIntegration(
      { appId: '12345', slug: 'codeguard-readonly', privateKey },
      fetcher,
    )
    const session = integration.createInstallationSession(456)
    assert.equal(integration.getInstallationId(session), 456)
    assert.equal(integration.getInstallationId(`${session}tampered`), null)

    const result = await integration.listRepositories(456, 1)
    assert.deepEqual(result, {
      totalCount: 1,
      repositories: [
        {
          id: 789,
          name: 'selected-repository',
          full_name: 'owner/selected-repository',
          private: true,
          html_url: 'https://github.com/owner/selected-repository',
          description: null,
          default_branch: 'main',
          language: 'TypeScript',
        },
      ],
    })
    assert.equal(requests.length, 2)
    assert.match(requests[0]?.authorization ?? '', /^Bearer [^.]+\.[^.]+\.[^.]+$/)
    assert.equal(requests[1]?.authorization, 'Bearer short-lived-installation-token')
  })
})
