import { createHmac, createSign, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

const installationTokenSchema = z.object({ token: z.string().min(1) })
const repositorySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  html_url: z.string().url(),
  description: z.string().nullable(),
  default_branch: z.string().nullable(),
  language: z.string().nullable(),
})
const repositoryResponseSchema = z.object({
  total_count: z.number().int().nonnegative(),
  repositories: z.array(repositorySchema),
})

export type GitHubRepository = z.infer<typeof repositorySchema>
export type GitHubRepositoryPage = {
  totalCount: number
  repositories: GitHubRepository[]
}

export type GitHubAppConfig = {
  appId: string
  slug: string
  privateKey: string
}

export type GitHubAppIntegration = {
  appSlug: string
  createInstallationSession(installationId: number): string
  getInstallationId(session: string | undefined): number | null
  listRepositories(installationId: number, page: number): Promise<GitHubRepositoryPage>
}

export class GitHubAppError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'GitHubAppError'
  }
}

const sessionLifetimeSeconds = 30 * 24 * 60 * 60

function createAppJwt(config: GitHubAppConfig) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: config.appId }),
  ).toString('base64url')
  const unsignedToken = `${header}.${payload}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()
  return `${unsignedToken}.${signer.sign(config.privateKey).toString('base64url')}`
}

function installationSessionSignature(config: GitHubAppConfig, payload: string) {
  return createHmac('sha256', config.privateKey).update(payload).digest('base64url')
}

export function createGitHubAppIntegration(
  config: GitHubAppConfig,
  fetcher: typeof fetch = fetch,
): GitHubAppIntegration {
  async function githubJson(url: string, init: RequestInit): Promise<unknown> {
    let response: Response
    try {
      response = await fetcher(url, {
        ...init,
        signal: AbortSignal.timeout(15_000),
      })
    } catch (error) {
      console.error('GitHub API request failed:', error instanceof Error ? error.message : 'Unknown error')
      throw new GitHubAppError(502, 'GitHub is temporarily unavailable. Please try again.')
    }

    if (!response.ok) {
      console.error('GitHub API request failed with status:', response.status)
      throw new GitHubAppError(502, 'GitHub could not authorize or load this installation.')
    }

    try {
      return await response.json()
    } catch {
      throw new GitHubAppError(502, 'GitHub returned an invalid response.')
    }
  }

  async function createInstallationToken(installationId: number) {
    const appJwt = createAppJwt(config)
    const payload = await githubJson(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${appJwt}`,
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'CodeGuardAI',
        },
        body: '{}',
      },
    )
    const parsed = installationTokenSchema.safeParse(payload)
    if (!parsed.success) throw new GitHubAppError(502, 'GitHub returned an invalid installation token.')
    return parsed.data.token
  }

  return {
    appSlug: config.slug,

    createInstallationSession(installationId) {
      const expiresAt = Math.floor(Date.now() / 1000) + sessionLifetimeSeconds
      const payload = `${installationId}.${expiresAt}`
      return `${payload}.${installationSessionSignature(config, payload)}`
    },

    getInstallationId(session) {
      if (!session) return null
      const [installationIdText, expiresAtText, signature, extra] = session.split('.')
      if (!installationIdText || !expiresAtText || !signature || extra !== undefined) return null

      const installationId = Number(installationIdText)
      const expiresAt = Number(expiresAtText)
      if (
        !Number.isSafeInteger(installationId) ||
        installationId < 1 ||
        !Number.isSafeInteger(expiresAt) ||
        expiresAt <= Math.floor(Date.now() / 1000)
      ) {
        return null
      }

      const payload = `${installationIdText}.${expiresAtText}`
      const expected = Buffer.from(installationSessionSignature(config, payload))
      const actual = Buffer.from(signature)
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
      return installationId
    },

    async listRepositories(installationId, page) {
      const token = await createInstallationToken(installationId)
      const payload = await githubJson(
        `https://api.github.com/installation/repositories?per_page=100&page=${page}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'CodeGuardAI',
          },
        },
      )
      const parsed = repositoryResponseSchema.safeParse(payload)
      if (!parsed.success) throw new GitHubAppError(502, 'GitHub returned an invalid repository response.')
      return {
        totalCount: parsed.data.total_count,
        repositories: parsed.data.repositories,
      }
    },
  }
}
