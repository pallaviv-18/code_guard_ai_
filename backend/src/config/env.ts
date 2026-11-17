import 'dotenv/config'
import { z } from 'zod'

const environmentSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
})

export const env = environmentSchema.parse(process.env)
