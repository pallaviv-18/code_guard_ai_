import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { z, ZodError } from 'zod'
import { SupabaseAnalyticsError, type VisitorAnalyticsService } from './services/visitorAnalytics.js'

const visitorIdSchema = z.string().uuid()
const sessionIdSchema = z.string().uuid()
const routeSchema = z.string().regex(/^\/[a-zA-Z0-9/_-]{0,199}$/)
const viewSchema = z.object({
  visitorId: visitorIdSchema,
  sessionId: sessionIdSchema,
  route: routeSchema,
}).strict()
const heartbeatSchema = z.object({
  visitorId: visitorIdSchema,
  sessionId: sessionIdSchema,
}).strict()
const daysSchema = z.coerce.number().int().min(1).max(90).default(7)
export function createApp(service: VisitorAnalyticsService, frontendUrl: string) {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  }))
  app.use(express.json({ limit: '10kb', strict: true }))
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  )

  app.get('/api/health', async (_request, response, next) => {
    try {
      await service.getStats(1)
      response.json({ status: 'ok', database: 'connected' })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/analytics/stats', async (request, response, next) => {
    try {
      const parsedDays = daysSchema.safeParse(request.query.days)
      if (!parsedDays.success) {
        response.status(400).json({ error: 'days must be an integer between 1 and 90' })
        return
      }

      response.json(await service.getStats(parsedDays.data))
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/analytics/view', async (request, response, next) => {
    try {
      const input = viewSchema.parse(request.body)
      await service.trackView(input)
      response.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/analytics/heartbeat', async (request, response, next) => {
    try {
      const input = heartbeatSchema.parse(request.body)
      await service.heartbeat(input)
      response.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: 'Invalid request',
        details: error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
      })
      return
    }

    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ error: 'Malformed JSON request body' })
      return
    }

    if (error instanceof SupabaseAnalyticsError) {
      console.error('Supabase analytics RPC failed:', {
        operation: error.operation,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
    } else {
      console.error('API request failed:', error instanceof Error ? error.message : 'Unknown error')
    }
    response.status(502).json({ error: 'The analytics service is temporarily unavailable.' })
  }

  app.use(errorHandler)
  return app
}
