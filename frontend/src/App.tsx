import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
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
} from 'lucide-react'
import { useVisitorAnalytics } from './hooks/useVisitorAnalytics'
import './App.css'

const VisitorActivityChart = lazy(() => import('./components/VisitorActivityChart'))

const navigation = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Code analysis', href: '/code-analysis', icon: Braces },
  { label: 'Resume analyzer', href: '/resume-analyzer', icon: FileText },
  { label: 'GitHub integration', href: '/integrations', icon: GitBranch },
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
  const analytics = useVisitorAnalytics(pathname)
  const currentPage = navigation.find((item) => item.href === pathname)
  const isOverview = pathname === '/' || pathname === '/visitors'
  const stats = analytics.stats

  return (
    <div className="app-shell">
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
          <ChevronDown size={15} />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = pathname === href
            return (
              <a className={`nav-item${active ? ' active' : ''}`} href={href} key={href}>
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
                {label === 'Code analysis' && <span className="nav-soon">SETUP</span>}
              </a>
            )
          })}
        </nav>

        <div className="nav-label tools-label">OBSERVABILITY</div>
        <nav className="primary-nav" aria-label="Analytics navigation">
          <a className={`nav-item${pathname === '/visitors' ? ' active' : ''}`} href="/visitors">
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
          <a className="nav-item muted-nav" href="/settings">
            <Settings size={17} strokeWidth={1.8} /><span>Settings</span>
          </a>
          <a className="nav-item muted-nav" href="/help">
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
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{isOverview ? (pathname === '/visitors' ? 'Visitor analytics' : 'Overview') : currentPage?.label ?? (pathname === '/settings' ? 'Settings' : 'Workspace')}</strong></div>
          <div className="topbar-actions">
            <div className={`connection-status ${analytics.status === 'ready' ? 'connected' : ''}`}>
              {analytics.status === 'ready' ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{analytics.status === 'ready' ? 'Supabase connected' : 'Supabase setup needed'}</span>
            </div>
            <div className="icon-button" aria-hidden="true"><Bell size={17} /></div>
            <div className="search-button" aria-hidden="true">
              <Search size={16} /><span>Search</span><kbd>⌘ K</kbd>
            </div>
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
              <a className="range-button" href="/visitors"><Clock3 size={15} /> Last 7 days <ChevronDown size={14} /></a>
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
                detail="Anonymous visitors · 7 days"
                icon={<Users size={17} />}
                tone="blue"
                status={analytics.status}
                trendIcon={<ArrowUpRight size={14} />}
              />
              <MetricCard
                title="Page views"
                value={formatNumber(stats?.total_views)}
                detail="Total visits · 7 days"
                icon={<BarChart3 size={17} />}
                tone="green"
                status={analytics.status}
                trendIcon={<ArrowDownRight size={14} />}
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
                  <span className="live-label"><i /> LIVE</span>
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
                  <ModuleRow icon={<Braces size={18} />} title="Code analysis" description="Static analysis and risk insights" tag="SETUP REQUIRED" />
                  <ModuleRow icon={<FileText size={18} />} title="Resume analyzer" description="Resume feedback and job matching" tag="SETUP REQUIRED" />
                  <ModuleRow icon={<GitBranch size={18} />} title="GitHub repositories" description="Connect a repository to get started" tag="NOT CONNECTED" />
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
        ) : (
          <div className="content placeholder-content">
            <div className="eyebrow"><span className="eyebrow-line" /> WORKSPACE MODULE</div>
            <h1>{currentPage?.label ?? (pathname === '/settings' ? 'Settings' : 'Help & support')}</h1>
            <p className="page-description">
              {pathname === '/integrations'
                ? 'Connect GitHub repositories after configuring the backend OAuth credentials.'
                : 'This module is not connected yet. Configure the services listed in the project setup guide before using it.'}
            </p>
            <div className="panel setup-notice">
              <div className="notice-icon"><LockKeyhole size={18} /></div>
              <div>
                <strong>Integration setup required</strong>
                <p>This workspace does not return mock scan results. Code analysis, resume processing, and authentication need their server-side services configured.</p>
              </div>
            </div>
            <a className="back-link" href="/">Back to overview <ArrowUpRight size={14} /></a>
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
}

function MetricCard({ title, value, detail, icon, tone, status, live, trendIcon }: MetricCardProps) {
  return (
    <article className="panel metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      {live ? (
        <span className="metric-badge live-badge"><i /> LIVE</span>
      ) : (
        <span className="metric-badge trend-badge">{trendIcon} <span>7D</span></span>
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
  icon: ReactNode
  title: string
  description: string
  tag: string
}

function ModuleRow({ icon, title, description, tag }: ModuleRowProps) {
  return (
    <div className="module-row">
      <div className="module-icon">{icon}</div>
      <div className="module-copy"><strong>{title}</strong><span>{description}</span></div>
      <span className="module-tag">{tag}</span>
    </div>
  )
}

export default App
