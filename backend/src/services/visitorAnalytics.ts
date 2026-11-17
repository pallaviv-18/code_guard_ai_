import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

const statsSchema = z.object({
  active_viewers: z.number().int().nonnegative(),
  total_views: z.number().int().nonnegative(),
  unique_visitors: z.number().int().nonnegative(),
  daily: z.array(
    z.object({
      date: z.string(),
      views: z.number().int().nonnegative(),
      unique_visitors: z.number().int().nonnegative(),
    }),
  ),
})

export type VisitorStats = z.infer<typeof statsSchema>

export type TrackViewInput = {
  visitorId: string
  sessionId: string
  route: string
}

export type HeartbeatInput = {
  visitorId: string
  sessionId: string
}

export type VisitorAnalyticsService = {
  trackView(input: TrackViewInput): Promise<void>
  heartbeat(input: HeartbeatInput): Promise<void>
  getStats(days: number): Promise<VisitorStats>
}

type SupabaseRpcError = {
  code: string
  details: string
  hint: string
  message: string
}

export class SupabaseAnalyticsError extends Error {
  constructor(
    readonly operation: string,
    readonly code: string,
    readonly details: string,
    readonly hint: string,
    message: string,
  ) {
    super(message)
    this.name = 'SupabaseAnalyticsError'
  }
}

function toSupabaseError(operation: string, error: SupabaseRpcError) {
  return new SupabaseAnalyticsError(operation, error.code, error.details, error.hint, error.message)
}

export function createVisitorAnalyticsService(client: SupabaseClient): VisitorAnalyticsService {
  return {
    async trackView({ visitorId, sessionId, route }) {
      const { error } = await client.rpc('track_public_view', {
        p_visitor_id: visitorId,
        p_session_id: sessionId,
        p_route: route,
      })
      if (error) throw toSupabaseError('record page view', error)
    },

    async heartbeat({ visitorId, sessionId }) {
      const { error } = await client.rpc('heartbeat_public_viewer', {
        p_visitor_id: visitorId,
        p_session_id: sessionId,
      })
      if (error) throw toSupabaseError('update viewer presence', error)
    },

    async getStats(days) {
      const { data, error } = await client.rpc('get_public_visitor_stats', { p_days: days })
      if (error) throw toSupabaseError('load viewer analytics', error)
      return statsSchema.parse(data)
    },
  }
}
