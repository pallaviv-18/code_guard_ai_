# CodeGuard AI — Viewer Analytics Foundation

CodeGuard AI provides a public React website and visitor analytics dashboard, a Node.js/Express API with Supabase analytics, and browser-based code and resume analysis tools.

## What works now

- React + TypeScript dashboard showing real active viewers, unique visitors, page views, and daily activity.
- Node.js API between the browser and database (`GET /api/analytics/stats`, `POST /api/analytics/view`, and `POST /api/analytics/heartbeat`).
- Supabase PostgreSQL tables, aggregate-only database functions, row-level security, and service-role-only function access.
- Server-side validation, CORS allow-listing, security headers, request-size limits, and rate limiting.
- Anonymous IDs only: visitor IDs stay in browser storage, session IDs are tab-scoped; no names, emails, IP addresses, or URL query parameters are stored.
- Explicit setup and connection error states; the dashboard never substitutes sample metrics.
- Code analysis runs locally in the browser and checks source text for possible embedded credentials, dynamic evaluation, debug statements/logging, TODOs, and long lines.
- Resume analysis runs locally in the browser and checks common sections, bullet points, measurable outcomes, and optional job-description keywords.
- Code and resume text are not uploaded or saved by these analysis tools. They provide heuristic guidance, not compiler, security-audit, AI, or hiring predictions.

User authentication, remote report storage, and AI-powered analysis are **not implemented**. Code/resume analysis currently runs locally and does not require those integrations.

## Architecture

```text
React dashboard (5173)
        │ HTTP, VITE_API_BASE_URL
        ▼
Node.js / Express API (3001)
        │ Supabase service-role key (server-side only)
        ▼
Supabase PostgreSQL + RLS

```

Only the backend uses `SUPABASE_SERVICE_ROLE_KEY`. The browser does not receive a Supabase key. Database tables have RLS enabled and no browser-role policies; functions return only aggregates and are executable only by Supabase's `service_role`.

## Requirements

- Node.js 20.19+ or 22.12+ (Node.js 24 is supported).
- A Supabase project.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/migrations/202611170001_public_visitor_analytics.sql`](./supabase/migrations/202611170001_public_visitor_analytics.sql).
3. Copy the project URL and **service_role** key from Supabase Project Settings → API. Keep the service-role key private.

The migration creates `public_page_views` and `public_viewer_sessions`. A heartbeat refreshes presence every 30 seconds; active viewers are unique anonymous browser IDs seen in the last 90 seconds. Sessions older than one day and page views older than 90 days are cleaned up during tracking calls.

## Configure and run

From the project root, open two PowerShell terminals.

**Terminal 1 — backend:**

```powershell
Copy-Item .env.example backend\.env
Set-Location backend
npm install
npm run dev
```

Edit `backend\.env` before running:

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service role secret.
- `FRONTEND_URL`: exact frontend origin, normally `http://localhost:5173`.
- `PORT`: API port, normally `3001`.

**Terminal 2 — frontend:**

```powershell
Copy-Item frontend\.env.example frontend\.env.local
Set-Location frontend
npm install
npm run dev
```

`frontend\.env.local` uses `VITE_API_BASE_URL=http://localhost:3001`. Open the Vite URL printed in the terminal for the public home page. Choose **Open workspace** or **Live analytics** to open the dashboard.

The backend checks its Supabase connection at `GET /api/health`. If configuration or the migration is missing, the UI surfaces the API/database error rather than showing fabricated counts.

## Troubleshooting Supabase errors

- Check `http://localhost:3001/api/health` and the backend terminal first. RPC failures are logged with the Supabase code, message, details, and hint; those diagnostics stay server-side.
- In Supabase Logs → API, check requests for `rpc/track_public_view`, `rpc/heartbeat_public_viewer`, and `rpc/get_public_visitor_stats`.
- A missing-function error (often `PGRST202`) usually means the migration was not applied. `401`/`403` generally indicates an invalid service-role key or permissions; `429` indicates rate limiting.
- This viewer-count stage does not call Supabase Auth, Realtime, or Edge Functions. Failures in those categories are from other clients or project activity.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Verify backend and Supabase connectivity |
| `GET` | `/api/analytics/stats?days=7` | Aggregate active viewers, page views, and unique visitors (1–90 days) |
| `POST` | `/api/analytics/view` | Record an anonymous page view |
| `POST` | `/api/analytics/heartbeat` | Refresh anonymous active-viewer presence |

The public visitor metric is useful for product visibility, not billing or security decisions. Client-side tracking can be blocked or spoofed.

## Local code and resume analysis

Open **Code analysis** or **Resume analyzer** from the workspace. Both tools run in the current browser tab and do not call the Node API.

- Code analysis accepts pasted source or source/text files up to 500 KB. Its checks are simple text-pattern heuristics; use your normal compiler, linter, and security tooling for a complete review.
- Resume analysis accepts pasted text or `.txt`/`.md` files up to 500 KB. Add a job description for an optional keyword comparison. PDF and Word files are not parsed; copy their text into the editor.
- Analysis results are not saved and disappear when you leave or refresh the page.

## Environment variables

The root `.env.example` documents the current backend values. Configure only `VITE_API_BASE_URL` in the frontend. Never prefix private credentials with `VITE_`.

## Validation

```powershell
Set-Location backend
npm test
npm run lint

Set-Location ..\frontend
npm run build
npm run lint
```

## Next stages

Implement Supabase Auth and user-owned RLS tables; optional code/resume storage and server-side analysis APIs; AI services; broader integration tests; and deployment hardening. Those integrations are not required for the current browser-based analysis tools.

## Deploy the current website

The frontend is configured for Vercel from the `frontend` root directory. Connect the source repository, select `frontend` as the Root Directory, and use the Vite defaults (`npm run build`, output `dist`). The Vercel rewrite keeps `/dashboard` and `/visitors` working on refresh.

The Node API can be created from the root `render.yaml` blueprint. Add the Supabase URL and service-role key in Render's environment settings, and set `FRONTEND_URL` to the deployed Vercel origin. After Render provides the API URL, set `VITE_API_BASE_URL` in the Vercel project's environment variables and redeploy the frontend. Apply the Supabase migration before testing `/api/health`; never place the service-role key in Vercel frontend variables.
