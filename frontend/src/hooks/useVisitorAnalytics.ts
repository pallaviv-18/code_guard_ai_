import { useCallback, useEffect, useRef, useState } from 'react'

export type DailyVisitorStats = {
  date: string
  views: number
  unique_visitors: number
}

export type VisitorStats = {
  active_viewers: number
  total_views: number
  unique_visitors: number
  daily: DailyVisitorStats[]
}

type TrackedPath = {
  pathname: string
  request: Promise<void>
}

type AnalyticsStatus = 'loading' | 'ready' | 'unconfigured' | 'error'

type AnalyticsState = {
  status: AnalyticsStatus
  stats: VisitorStats | null
  error: string | null
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')
const REFRESH_INTERVAL_MS = 30_000
const VISITOR_KEY = 'codeguard:visitor-id'
const SESSION_KEY = 'codeguard:session-id'

function getOrCreateId(storage: Storage, key: string): string {
  const existing = storage.getItem(key)
  if (existing) return existing

  const id = crypto.randomUUID()
  storage.setItem(key, id)
  return id
}

function isVisitorStats(value: unknown): value is VisitorStats {
  if (!value || typeof value !== 'object') return false
  const stats = value as Record<string, unknown>
  return (
    typeof stats.active_viewers === 'number' &&
    typeof stats.total_views === 'number' &&
    typeof stats.unique_visitors === 'number' &&
    Array.isArray(stats.daily) &&
    stats.daily.every(
      (row) =>
        row !== null &&
        typeof row === 'object' &&
        typeof (row as Record<string, unknown>).date === 'string' &&
        typeof (row as Record<string, unknown>).views === 'number' &&
        typeof (row as Record<string, unknown>).unique_visitors === 'number',
    )
  )
}

async function postJson(path: string, body: Record<string, string>): Promise<void> {
  if (!API_BASE_URL) throw new Error('Node API is not configured. Set VITE_API_BASE_URL.')

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string }
    throw new Error(payload.error ?? `Analytics API request failed (${response.status}).`)
  }
}

async function getStats(days: number): Promise<VisitorStats> {
  if (!API_BASE_URL) throw new Error('Node API is not configured. Set VITE_API_BASE_URL.')

  const response = await fetch(`${API_BASE_URL}/api/analytics/stats?days=${days}`)
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string }
    throw new Error(payload.error ?? `Analytics API request failed (${response.status}).`)
  }

  const data: unknown = await response.json()
  if (!isVisitorStats(data)) throw new Error('The Node API returned analytics in an unexpected format.')
  return data
}

export function useVisitorAnalytics(pathname: string, rangeDays: number): AnalyticsState {
  const trackedPath = useRef<TrackedPath | null>(null)
  const [state, setState] = useState<AnalyticsState>({
    status: API_BASE_URL ? 'loading' : 'unconfigured',
    stats: null,
    error: null,
  })

  const refreshStats = useCallback(async () => {
    const stats = await getStats(rangeDays)
    setState({ status: 'ready', stats, error: null })
  }, [rangeDays])

  useEffect(() => {
    if (!API_BASE_URL) return

    let active = true
    let heartbeatTimer: number | undefined

    const ids = () => ({
      visitorId: getOrCreateId(window.localStorage, VISITOR_KEY),
      sessionId: getOrCreateId(window.sessionStorage, SESSION_KEY),
    })

    const trackPath = () => {
      if (trackedPath.current?.pathname === pathname) return trackedPath.current.request

      const request = Promise.resolve().then(() =>
        postJson('/api/analytics/view', { ...ids(), route: pathname }),
      )
      trackedPath.current = { pathname, request }
      return request
    }

    const heartbeat = async () => {
      try {
        await postJson('/api/analytics/heartbeat', ids())
        if (active) await refreshStats()
      } catch (error) {
        if (!active) return
        const message = error instanceof Error ? error.message : 'Viewer heartbeat failed.'
        setState((current) => ({ ...current, error: message }))
      }
    }

    void trackPath()
      .then(() => (active ? refreshStats() : undefined))
      .catch((error: unknown) => {
        if (!active) return
        const message = error instanceof Error ? error.message : 'Viewer analytics failed.'
        setState({ status: 'error', stats: null, error: message })
      })
    heartbeatTimer = window.setInterval(() => void heartbeat(), REFRESH_INTERVAL_MS)

    return () => {
      active = false
      if (heartbeatTimer !== undefined) window.clearInterval(heartbeatTimer)
    }
  }, [pathname, refreshStats])

  return state
}
