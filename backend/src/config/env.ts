import 'dotenv/config'
import { z } from 'zod'

const optionalEnvironmentValue = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
)

const environmentSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  GITHUB_APP_ID: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().regex(/^\d+$/).optional(),
  ),
  GITHUB_APP_SLUG: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().regex(/^[A-Za-z0-9-]+$/).optional(),
  ),
  GITHUB_APP_PRIVATE_KEY: optionalEnvironmentValue,
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
}).superRefine((values, context) => {
  const githubValues = [values.GITHUB_APP_ID, values.GITHUB_APP_SLUG, values.GITHUB_APP_PRIVATE_KEY]
  if (githubValues.some(Boolean) && !githubValues.every(Boolean)) {
    context.addIssue({
      code: 'custom',
      path: ['GITHUB_APP_ID'],
      message: 'GITHUB_APP_ID, GITHUB_APP_SLUG, and GITHUB_APP_PRIVATE_KEY must be configured together.',
    })
  }
})

export const env = environmentSchema.parse(process.env)

export const githubAppConfig =
  env.GITHUB_APP_ID && env.GITHUB_APP_SLUG && env.GITHUB_APP_PRIVATE_KEY
    ? {
        appId: env.GITHUB_APP_ID,
        slug: env.GITHUB_APP_SLUG,
        privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }
    : undefined
