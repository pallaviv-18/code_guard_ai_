import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Braces,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  GitBranch,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { useVisitorAnalytics } from './hooks/useVisitorAnalytics'
import LandingPage from './pages/LandingPage'
import CodeAnalysisPage from './pages/CodeAnalysisPage'
import ResumeAnalyzerPage from './pages/ResumeAnalyzerPage'
import './App.css'

const VisitorActivityChart = lazy(() => import('./components/VisitorActivityChart'))

const navigation = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Code analysis', href: '/code-analysis', icon: Braces },
  { label: 'Resume analyzer', href: '/resume-analyzer', icon: FileText },
  { label: 'GitHub integration', href: '/integrations', icon: GitBranch },
]
const searchDestinations = [
  ...navigation,
  { label: 'Visitor analytics', href: '/visitors', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Help & support', href: '/help', icon: CircleHelp },
]
const dateRanges = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
]
const currentDateLabel = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}).format(new Date()).toUpperCase()

function usePathname() {
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    const updatePath = () => setPathname(window.location.pathname)
    window.addEventListener('popstate', updatePath)
    return () => window.removeEventListener('popstate', updatePath)
  }, [])

  return pathname
}

function formatNumber(value: number | undefined) {
  return value === undefined ? '—' : new Intl.NumberFormat().format(value)
}

function App() {
  const pathname = usePathname()
  const [rangeDays, setRangeDays] = useState(7)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchDialogRef = useRef<HTMLDialogElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const analytics = useVisitorAnalytics(pathname, rangeDays)
  const currentPage = navigation.find((item) => item.href === pathname)
  const pageTitle =
    currentPage?.label ??
    (pathname === '/settings' ? 'Settings' : pathname === '/help' ? 'Help & support' : 'Workspace')
  const isOverview = pathname === '/dashboard' || pathname === '/visitors'
  const stats = analytics.stats
  const rangeLabel = `${rangeDays} days`
  const matchingDestinations = searchDestinations.filter((destination) =>
    destination.label.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  )

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    const dialog = searchDialogRef.current
    if (searchOpen) {
      if (dialog && !dialog.open) dialog.showModal()
      searchInputRef.current?.focus()
    } else if (dialog?.open) {
      dialog.close()
    }
  }, [searchOpen])

  if (pathname === '/') {
    return (
      <LandingPage
        analyticsStatus={analytics.status}
        activeViewers={stats?.active_viewers}
        daily={stats?.daily}
      />
    )
  }

  return (
    <div className="app-shell">
      <dialog
        className="command-dialog"
        id="workspace-search"
        ref={searchDialogRef}
        aria-labelledby="command-title"
        onClose={() => {
          setSearchOpen(false)
          setSearchQuery('')
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            searchDialogRef.current?.close()
          }
        }}
      >
        <div className="command-heading">
          <div>
            <strong id="command-title">Go to</strong>
            <span>Search workspace pages</span>
          </div>
          <button
            type="button"
            className="command-close"
            aria-label="Close search"
            onClick={() => searchDialogRef.current?.close()}
          >
            <X size={17} />
          </button>
        </div>
        <label className="command-input">
          <Search size={17} />
          <input
            ref={searchInputRef}
            aria-label="Search workspace pages"
            autoComplete="off"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <kbd>ESC</kbd>
        </label>
        <nav className="command-results" aria-label="Search results">
          {matchingDestinations.length ? (
            matchingDestinations.map(({ label, href, icon: Icon }) => (
              <a href={href} className="command-result" key={href}>
                <Icon size={16} />
                <span>{label}</span>
                <ArrowUpRight size={14} />
              </a>
            ))
          ) : (
            <p className="command-empty">No workspace pages match “{searchQuery}”.</p>
          )}
        </nav>
        <div className="command-footer"><span>Navigate anywhere in your workspace</span><kbd>Ctrl K</kbd></div>
      </dialog>

      <aside className="sidebar">
        <a className="brand" href="/" aria-label="CodeGuard AI home">
          <span className="brand-mark"><ShieldCheck size={21} strokeWidth={2.2} /></span>
          <span className="brand-copy">
            <strong>CodeGuard<span>AI</span></strong>
            <small>CODE INTELLIGENCE</small>
          </span>
        </a>

        <div className="workspace-picker">
          <div className="workspace-icon">CG</div>
          <div className="workspace-copy">
            <span>Workspace</span>
            <strong>My workspace</strong>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = pathname === href
            return (
              <a
                className={`nav-item${active ? ' active' : ''}`}
                href={href}
                key={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                title={label}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
                {label === 'Code analysis' && <span className="nav-soon">LOCAL</span>}
              </a>
            )
          })}
        </nav>

        <div className="nav-label tools-label">OBSERVABILITY</div>
        <nav className="primary-nav" aria-label="Analytics navigation">
          <a
            className={`nav-item${pathname === '/visitors' ? ' active' : ''}`}
            href="/visitors"
            aria-label="Visitor analytics"
            aria-current={pathname === '/visitors' ? 'page' : undefined}
            title="Visitor analytics"
          >
            <BarChart3 size={17} strokeWidth={1.8} />
            <span>Visitor analytics</span>
            <span className="live-dot" aria-label="Public" />
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-card">
            <div className="privacy-icon"><LockKeyhole size={15} /></div>
            <div>
              <strong>Privacy first</strong>
              <p>Only anonymous visitor IDs are stored.</p>
            </div>
          </div>
          <a className="nav-item muted-nav" href="/settings" aria-label="Settings" title="Settings">
            <Settings size={17} strokeWidth={1.8} /><span>Settings</span>
          </a>
          <a className="nav-item muted-nav" href="/help" aria-label="Help & support" title="Help & support">
            <CircleHelp size={17} strokeWidth={1.8} /><span>Help & support</span>
          </a>
          <div className="profile-row">
            <div className="avatar">CG</div>
            <div className="profile-copy"><strong>Public dashboard</strong><span>Visitor view</span></div>
            <span className="public-pill">PUBLIC</span>
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{isOverview ? (pathname === '/visitors' ? 'Visitor analytics' : 'Overview') : pageTitle}</strong></div>
          <div className="topbar-actions">
            <div className={`connection-status ${pathname === '/code-analysis' || pathname === '/resume-analyzer' || analytics.status === 'ready' ? 'connected' : ''}`}>
              {pathname === '/code-analysis' || pathname === '/resume-analyzer'
                ? <ShieldCheck size={14} />
                : analytics.status === 'ready' ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>
                {pathname === '/code-analysis' || pathname === '/resume-analyzer'
                  ? 'Runs locally'
                  : analytics.status === 'ready' ? 'Supabase connected' : 'Supabase setup needed'}
              </span>
            </div>
            <button
              type="button"
              className="search-button"
              aria-haspopup="dialog"
              aria-controls="workspace-search"
              aria-expanded={searchOpen}
              aria-label="Search workspace pages"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={16} /><span>Search</span><kbd>Ctrl K</kbd>
            </button>
          </div>
        </header>

        {isOverview ? (
          <div className="content">
            <section className="welcome-row">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" /> {currentDateLabel}</div>
                <h1>Good to see you <span className="wave">✳</span></h1>
                <p className="page-description">Your code intelligence workspace at a glance.</p>
              </div>
              <label className="range-control">
                <Clock3 size={15} />
                <select
                  aria-label="Analytics date range"
                  value={rangeDays}
                  onChange={(event) => setRangeDays(Number(event.target.value))}
                >
                  {dateRanges.map(({ days, label }) => (
                    <option key={days} value={days}>{label}</option>
                  ))}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </label>
            </section>

            <section className="metric-grid" aria-label="Public visitor statistics">
              <MetricCard
                title="Active viewers"
                value={formatNumber(stats?.active_viewers)}
                detail="Live in the last 90 seconds"
                icon={<Activity size={17} />}
                tone="violet"
                status={analytics.status}
                live
              />
              <MetricCard
                title="Unique visitors"
                value={formatNumber(stats?.unique_visitors)}
                detail={`Anonymous visitors · ${rangeLabel}`}
                icon={<Users size={17} />}
                tone="blue"
                status={analytics.status}
                trendIcon={<ArrowUpRight size={14} />}
                rangeDays={rangeDays}
              />
              <MetricCard
                title="Page views"
                value={formatNumber(stats?.total_views)}
                detail={`Total visits · ${rangeLabel}`}
                icon={<BarChart3 size={17} />}
                tone="green"
                status={analytics.status}
                trendIcon={<ArrowDownRight size={14} />}
                rangeDays={rangeDays}
              />
            </section>

            <section className="dashboard-grid">
              <div className="panel traffic-panel">
                <div className="panel-heading">
                  <div>
                    <div className="panel-title">Visitor activity</div>
                    <div className="panel-subtitle">Daily page views and unique visitors</div>
                  </div>
                  <div className="chart-legend">
                    <span><i className="legend-dot views-dot" /> Page views</span>
                    <span><i className="legend-dot visitors-dot" /> Visitors</span>
                  </div>
                </div>
                {analytics.status === 'ready' && stats?.daily ? (
                  <Suspense fallback={<div className="analytics-empty">Loading chart…</div>}>
                    <VisitorActivityChart daily={stats.daily} />
                  </Suspense>
                ) : (
                  <AnalyticsEmptyState status={analytics.status} error={analytics.error} />
                )}
              </div>

              <div className="panel realtime-panel">
                <div className="panel-heading">
                  <div>
                    <div className="panel-title">Live audience</div>
                    <div className="panel-subtitle">Currently active on the site</div>
                  </div>
                  <span className={`live-label${analytics.status === 'ready' ? '' : ' offline-label'}`}>
                    <i /> {analytics.status === 'ready' ? 'LIVE' : analytics.status === 'loading' ? 'CONNECTING' : 'NOT CONNECTED'}
                  </span>
                </div>
                <div className="audience-count">
                  <strong>{formatNumber(stats?.active_viewers)}</strong>
                  <span>active {stats?.active_viewers === 1 ? 'viewer' : 'viewers'}</span>
                </div>
                <div className="audience-visual" aria-hidden="true">
                  <div className="audience-wave wave-one" />
                  <div className="audience-wave wave-two" />
                  <div className="audience-wave wave-three" />
                  <div className="audience-center"><Users size={25} /></div>
                </div>
                <div className="realtime-foot">
                  <span><i className="status-dot" /> Updates every 30 seconds</span>
                  <span>90s presence window</span>
                </div>
              </div>
            </section>

            {analytics.error && (
              <div className="inline-error" role="alert">
                <WifiOff size={16} /><span>{analytics.error}</span>
              </div>
            )}

            <section className="lower-grid">
              <div className="panel modules-panel">
                <div className="panel-heading">
                  <div>
                    <div className="panel-title">Your workspace</div>
                    <div className="panel-subtitle">Tools for safer, stronger applications</div>
                  </div>
                </div>
                <div className="module-list">
                  <ModuleRow href="/code-analysis" icon={<Braces size={18} />} title="Code analysis" description="Local static checks and risk hints" tag="READY · LOCAL" />
                  <ModuleRow href="/resume-analyzer" icon={<FileText size={18} />} title="Resume analyzer" description="Local resume and job keyword check" tag="READY · LOCAL" />
                  <ModuleRow href="/integrations" icon={<GitBranch size={18} />} title="GitHub repositories" description="Connect a repository to get started" tag="NOT CONNECTED" />
                </div>
              </div>
              <div className="panel connection-panel">
                <div className="connection-heading">
                  <div className="integration-icon"><Wifi size={19} /></div>
                  <div><div className="panel-title">Supabase analytics</div><div className="panel-subtitle">Public viewer counter</div></div>
                </div>
                <p className="connection-copy">
                  {analytics.status === 'ready'
                    ? 'Visitor metrics are being read from your Supabase project. Only aggregate counts are shown publicly.'
                    : 'Configure the Node API with your Supabase server credentials, then apply the database migration to connect live counts.'}
                </p>
                <div className="connection-detail">
                  <span><span className={`connection-dot ${analytics.status === 'ready' ? 'is-connected' : ''}`} /> Database connection</span>
                  <strong>{analytics.status === 'ready' ? 'Connected' : analytics.status === 'loading' ? 'Connecting…' : 'Not configured'}</strong>
                </div>
                <div className="connection-detail">
                  <span><LockKeyhole size={13} /> Raw visitor records</span>
                  <strong>Private</strong>
                </div>
              </div>
            </section>

            <footer className="page-footer">
              <span>© 2026 CodeGuard AI</span>
              <span>Built for thoughtful engineering <span className="footer-heart">✦</span></span>
            </footer>
          </div>
        ) : pathname === '/code-analysis' ? (
          <CodeAnalysisPage />
        ) : pathname === '/resume-analyzer' ? (
          <ResumeAnalyzerPage />
        ) : (
          <div className="content placeholder-content">
            <div className="eyebrow"><span className="eyebrow-line" /> WORKSPACE MODULE</div>
            <h1>{pageTitle}</h1>
            <p className="page-description">
              {pathname === '/integrations'
                ? 'Connect GitHub repositories after configuring the backend OAuth credentials.'
                : pathname === '/settings'
                  ? 'Review the service connection status and the configuration needed to bring your workspace online.'
                  : pathname === '/help'
                    ? 'Find setup guidance for analytics, integrations, and the workspace modules that are still in development.'
                    : 'This module is not connected yet. Configure the services listed in the project setup guide before using it.'}
            </p>
            <div className="panel setup-notice">
              <div className="notice-icon"><LockKeyhole size={18} /></div>
              <div>
                <strong>{pathname === '/help' ? 'What is available today' : pathname === '/settings' ? 'Service connection status' : 'Integration setup required'}</strong>
                <p>
                  {pathname === '/help'
                    ? 'Code and resume checks run locally in your browser. Visitor analytics requires the Supabase migration and Node API, while GitHub OAuth still needs server-side credentials.'
                    : pathname === '/settings'
                      ? analytics.status === 'ready'
                        ? 'The analytics API is connected. Private credentials remain on the server and are never exposed in this browser.'
                        : 'Analytics requires a deployed Node API with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, plus the Supabase visitor analytics migration.'
                      : 'This workspace does not return mock scan results. Code analysis, resume processing, and authentication need their server-side services configured.'}
                </p>
              </div>
            </div>
            {pathname === '/help' && (
              <a
                className="back-link"
                href="https://github.com/pallaviv-18/code_guard_ai_/#readme"
                target="_blank"
                rel="noreferrer"
              >
                Open setup guide <ArrowUpRight size={14} />
              </a>
            )}
            <a className="back-link" href="/dashboard">Back to overview <ArrowUpRight size={14} /></a>
          </div>
        )}
      </main>
    </div>
  )
}

type MetricCardProps = {
  title: string
  value: string
  detail: string
  icon: ReactNode
  tone: 'violet' | 'blue' | 'green'
  status: string
  live?: boolean
  trendIcon?: React.ReactNode
  rangeDays?: number
}

function MetricCard({ title, value, detail, icon, tone, status, live, trendIcon, rangeDays }: MetricCardProps) {
  return (
    <article className="panel metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      {live ? (
        <span className={`metric-badge ${status === 'ready' ? 'live-badge' : 'offline-badge'}`}>
          {status === 'ready' ? <><i /> LIVE</> : status === 'loading' ? 'CONNECTING' : 'NOT CONNECTED'}
        </span>
      ) : (
        <span className="metric-badge trend-badge">{trendIcon} <span>{rangeDays}D</span></span>
      )}
      <div className="metric-label">{title}</div>
      <div className="metric-value">{status === 'loading' ? <LoaderCircle className="loading-icon" size={27} /> : value}</div>
      <div className="metric-detail">{detail}</div>
    </article>
  )
}

type AnalyticsEmptyStateProps = {
  status: string
  error: string | null
}

function AnalyticsEmptyState({ status, error }: AnalyticsEmptyStateProps) {
  const isLoading = status === 'loading'
  const Icon = isLoading ? LoaderCircle : WifiOff

  return (
    <div className="analytics-empty">
      <div className="empty-icon"><Icon size={20} className={isLoading ? 'loading-icon' : ''} /></div>
      <strong>{isLoading ? 'Connecting to Supabase' : 'Analytics not connected'}</strong>
      <p>{error ?? 'Configure Supabase to load real visitor activity. No sample numbers are displayed.'}</p>
    </div>
  )
}

type ModuleRowProps = {
  href: string
  icon: ReactNode
  title: string
  description: string
  tag: string
}

function ModuleRow({ href, icon, title, description, tag }: ModuleRowProps) {
  return (
    <a className="module-row" href={href}>
      <div className="module-icon">{icon}</div>
      <div className="module-copy"><strong>{title}</strong><span>{description}</span></div>
      <span className="module-tag">{tag}</span>
    </a>
  )
}

export default App
