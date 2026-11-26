import { randomBytes, timingSafeEqual } from 'node:crypto'
import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { z, ZodError } from 'zod'
import { GitHubAppError, type GitHubAppIntegration } from './services/githubApp.js'
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
const githubCallbackSchema = z.object({
  setup_action: z.enum(['install', 'update']),
  installation_id: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  state: z.string().min(16).max(200),
})
const githubPageSchema = z.object({
  page: z.coerce.number().int().min(1).max(100).default(1),
})
const githubStateCookie = 'codeguard_github_state'
const githubInstallationCookie = 'codeguard_github_installation'
const githubCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/github',
}

function getCookie(request: express.Request, name: string) {
  const prefix = `${name}=`
  return request.headers.cookie
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length)
}

export function createApp(
  service: VisitorAnalyticsService,
  frontendUrl: string,
  githubApp?: GitHubAppIntegration,
) {
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

  app.get('/api/github/status', (request, response) => {
    if (!githubApp) {
      response.json({ configured: false, connected: false })
      return
    }

    response.json({
      configured: true,
      connected: githubApp.getInstallationId(getCookie(request, githubInstallationCookie)) !== null,
    })
  })

  app.get('/api/github/install', (request, response) => {
    if (!githubApp) {
      response.status(503).json({ error: 'The GitHub App is not configured on the server.' })
      return
    }

    const state = randomBytes(32).toString('base64url')
    response.cookie(githubStateCookie, state, {
      ...githubCookieOptions,
      maxAge: 5 * 60 * 1000,
    })
    const installUrl = new URL(`https://github.com/apps/${githubApp.appSlug}/installations/new`)
    installUrl.searchParams.set('state', state)
    response.redirect(302, installUrl.toString())
  })

  app.get('/api/github/callback', (request, response) => {
    if (!githubApp) {
      response.status(503).json({ error: 'The GitHub App is not configured on the server.' })
      return
    }

    const query = githubCallbackSchema.safeParse(request.query)
    const cookieState = getCookie(request, githubStateCookie)
    const state = query.success ? query.data.state : ''
    const stateBuffer = Buffer.from(state)
    const cookieBuffer = Buffer.from(cookieState ?? '')
    const validState =
      cookieBuffer.length > 0 &&
      stateBuffer.length === cookieBuffer.length &&
      timingSafeEqual(stateBuffer, cookieBuffer)

    response.clearCookie(githubStateCookie, githubCookieOptions)
    if (!query.success || !validState) {
      const destination = new URL('/integrations', frontendUrl)
      destination.searchParams.set('github_error', 'invalid_callback')
      response.redirect(302, destination.toString())
      return
    }

    response.cookie(
      githubInstallationCookie,
      githubApp.createInstallationSession(query.data.installation_id),
      {
        ...githubCookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    )
    const destination = new URL('/integrations', frontendUrl)
    destination.searchParams.set('github', 'connected')
    response.redirect(302, destination.toString())
  })

  app.get('/api/github/repositories', async (request, response, next) => {
    try {
      if (!githubApp) {
        response.status(503).json({ error: 'The GitHub App is not configured on the server.' })
        return
      }

      const installationId = githubApp.getInstallationId(
        getCookie(request, githubInstallationCookie),
      )
      if (installationId === null) {
        response.status(401).json({ error: 'Connect the GitHub App to view repositories.' })
        return
      }

      const parsedPage = githubPageSchema.safeParse(request.query)
      if (!parsedPage.success) {
        response.status(400).json({ error: 'page must be an integer between 1 and 100' })
        return
      }

      response.json(await githubApp.listRepositories(installationId, parsedPage.data.page))
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/github/disconnect', (_request, response) => {
    response.clearCookie(githubInstallationCookie, githubCookieOptions)
    response.status(204).end()
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

    if (error instanceof GitHubAppError) {
      response.status(error.statusCode).json({ error: error.message })
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
