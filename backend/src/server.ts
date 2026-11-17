import { createClient } from '@supabase/supabase-js'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { createVisitorAnalyticsService } from './services/visitorAnalytics.js'

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const app = createApp(createVisitorAnalyticsService(supabase), env.FRONTEND_URL)
const server = app.listen(env.PORT, () => {
  console.log(`CodeGuard API listening on port ${env.PORT}`)
})

function shutdown() {
  server.close((error) => {
    if (error) {
      console.error('API shutdown failed:', error.message)
      process.exitCode = 1
    }
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
