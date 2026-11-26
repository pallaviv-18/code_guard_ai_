import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, ExternalLink, GitBranch, LoaderCircle, RefreshCw, Unplug } from 'lucide-react'

type GitHubStatus = {
  configured: boolean
  connected: boolean
}

type GitHubRepository = {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description: string | null
  default_branch: string | null
  language: string | null
}

type RepositoryPage = {
  totalCount: number
  repositories: GitHubRepository[]
}

const API_BASE_URL = import.meta.env.DEV
  ? import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
  : ''

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function isGitHubStatus(value: unknown): value is GitHubStatus {
  return (
    isRecord(value) &&
    typeof value.configured === 'boolean' &&
    typeof value.connected === 'boolean'
  )
}

function isGitHubRepository(value: unknown): value is GitHubRepository {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.full_name === 'string' &&
    typeof value.private === 'boolean' &&
    typeof value.html_url === 'string' &&
    (typeof value.description === 'string' || value.description === null) &&
    (typeof value.default_branch === 'string' || value.default_branch === null) &&
    (typeof value.language === 'string' || value.language === null)
  )
}

function isRepositoryPage(value: unknown): value is RepositoryPage {
  return (
    isRecord(value) &&
    typeof value.totalCount === 'number' &&
    Array.isArray(value.repositories) &&
    value.repositories.every(isGitHubRepository)
  )
}

async function githubRequest(path: string, init?: RequestInit) {
  if (import.meta.env.DEV && !API_BASE_URL) {
    throw new Error('Set VITE_API_BASE_URL to use the GitHub integration locally.')
  }

  const response = await fetch(`${API_BASE_URL}/api/github${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let message = `GitHub API request failed (${response.status}).`
    try {
      const payload: unknown = await response.json()
      if (isRecord(payload) && typeof payload.error === 'string') message = payload.error
    } catch {
      // Keep the HTTP status message when the server does not return JSON.
    }
    throw new Error(message)
  }

  return response
}

async function githubJson(path: string): Promise<unknown> {
  return githubRequest(path).then((response) => response.json())
}

export default function GitHubIntegrationPage() {
  const [configured, setConfigured] = useState(false)
  const [connected, setConnected] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [repositoriesLoading, setRepositoriesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('github_error')) {
      return 'GitHub setup could not be verified. Please try connecting again.'
    }
    return params.get('github') === 'connected'
      ? 'GitHub App installed. Your selected repositories are ready.'
      : null
  })

  const loadRepositories = useCallback(async (nextPage = 1, append = false) => {
    setRepositoriesLoading(true)
    setError(null)
    try {
      const payload = await githubJson(`/repositories?page=${nextPage}`)
      if (!isRepositoryPage(payload)) {
        throw new Error('The GitHub API returned repositories in an unexpected format.')
      }
      setRepositories((current) =>
        append ? [...current, ...payload.repositories] : payload.repositories,
      )
      setTotalCount(payload.totalCount)
      setPage(nextPage)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load repositories.')
    } finally {
      setRepositoriesLoading(false)
    }
  }, [])

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true)
    setError(null)
    try {
      const payload = await githubJson('/status')
      if (!isGitHubStatus(payload)) throw new Error('The GitHub API returned an unexpected status.')
      setConfigured(payload.configured)
      setConnected(payload.connected)
      if (payload.connected) {
        await loadRepositories()
      } else {
        setRepositories([])
        setTotalCount(0)
        setPage(1)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not check GitHub status.')
    } finally {
      setStatusLoading(false)
    }
  }, [loadRepositories])

  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.has('github') || url.searchParams.has('github_error')) {
      window.history.replaceState(null, '', `${url.pathname}${url.hash}`)
    }
    const timer = window.setTimeout(() => void refreshStatus(), 0)
    return () => window.clearTimeout(timer)
  }, [refreshStatus])

  async function disconnect() {
    setError(null)
    try {
      await githubRequest('/disconnect', { method: 'POST' })
      setConnected(false)
      setRepositories([])
      setTotalCount(0)
      setPage(1)
      setNotice('GitHub App disconnected from this browser.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not disconnect GitHub.')
    }
  }

  const callbackUrl = `${window.location.origin}/api/github/callback`

  return (
    <div className="content github-content">
      <div className="eyebrow"><span className="eyebrow-line" /> GITHUB INTEGRATION</div>
      <h1>GitHub repositories</h1>
      <p className="page-description">
        Connect a GitHub App installation to browse repositories you explicitly select.
        Repository access is read-only.
      </p>

      <section className="panel github-panel" aria-labelledby="github-panel-title">
        <div className="github-panel-heading">
          <div className="connection-heading">
            <div className="integration-icon"><GitBranch size={19} /></div>
            <div>
              <div className="panel-title" id="github-panel-title">GitHub App</div>
              <div className="panel-subtitle">Selected repositories · read-only</div>
            </div>
          </div>
          <span className={`github-status ${connected ? 'is-connected' : ''}`}>
            <span className="connection-dot" />
            {statusLoading ? 'CHECKING' : connected ? 'CONNECTED' : configured ? 'READY TO CONNECT' : 'SETUP REQUIRED'}
          </span>
        </div>

        {notice && <p className="github-notice" role="status">{notice}</p>}
        {error && <p className="tool-error" role="alert">{error}</p>}

        {statusLoading ? (
          <div className="github-loading"><LoaderCircle size={16} className="github-spinner" /> Checking GitHub App status…</div>
        ) : !configured ? (
          <div className="github-setup">
            <div>
              <strong>Configure the GitHub App on the backend</strong>
              <p>
                Add <code>GITHUB_APP_ID</code>, <code>GITHUB_APP_SLUG</code>, and
                {' '}<code>GITHUB_APP_PRIVATE_KEY</code> to the Render service environment.
                Keep the private key server-side; never add it to Vercel or a <code>VITE_</code> variable.
              </p>
            </div>
            <div className="github-callback">
              <span>GitHub App Setup URL</span>
              <code>{callbackUrl}</code>
            </div>
            <p className="github-permissions">
              Grant only repository metadata read access, then install the App on selected repositories.
            </p>
          </div>
        ) : !connected ? (
          <div className="github-connect">
            <p>Install the configured GitHub App and choose which repositories it can see.</p>
            <a className="primary-button" href={`${API_BASE_URL}/api/github/install`}>
              <GitBranch size={15} /> Connect GitHub App
            </a>
          </div>
        ) : (
          <div className="github-repositories">
            <div className="github-repository-toolbar">
              <span>{totalCount} {totalCount === 1 ? 'repository' : 'repositories'} available</span>
              <div>
                <button className="upload-button" type="button" onClick={() => void refreshStatus()} disabled={repositoriesLoading}>
                  <RefreshCw size={13} /> Refresh
                </button>
                <button className="upload-button" type="button" onClick={() => void disconnect()}>
                  <Unplug size={13} /> Disconnect
                </button>
              </div>
            </div>
            {repositories.length > 0 ? (
              <ul className="github-repository-list">
                {repositories.map((repository) => (
                  <li className="github-repository" key={repository.id}>
                    <div className="github-repository-copy">
                      <a href={repository.html_url} target="_blank" rel="noreferrer">
                        {repository.full_name} <ExternalLink size={12} />
                      </a>
                      <p>{repository.description || 'No description provided.'}</p>
                      <div className="github-repository-meta">
                        {repository.private ? 'Private' : 'Public'}
                        {repository.language && <span>{repository.language}</span>}
                        {repository.default_branch && <span>Default branch: {repository.default_branch}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : repositoriesLoading ? (
              <div className="github-loading"><LoaderCircle size={16} className="github-spinner" /> Loading repositories…</div>
            ) : (
              <p className="github-empty">No repositories are available to this installation.</p>
            )}
            {repositories.length < totalCount && (
              <button
                className="upload-button github-load-more"
                type="button"
                onClick={() => void loadRepositories(page + 1, true)}
                disabled={repositoriesLoading}
              >
                {repositoriesLoading ? <LoaderCircle size={13} className="github-spinner" /> : <ArrowUpRight size={13} />}
                Load more repositories
              </button>
            )}
          </div>
        )}
      </section>

      <a className="back-link" href="/dashboard">Back to overview <ArrowUpRight size={14} /></a>
    </div>
  )
}
