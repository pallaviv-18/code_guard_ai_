import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Braces,
  Check,
  FileText,
  Fingerprint,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import type { DailyVisitorStats } from '../hooks/useVisitorAnalytics'
import './LandingPage.css'

type LandingPageProps = {
  analyticsStatus: string
  activeViewers?: number
  daily?: DailyVisitorStats[]
}

function LandingPage({ analyticsStatus, activeViewers, daily }: LandingPageProps) {
  const isConnected = analyticsStatus === 'ready'
  const connectionLabel =
    isConnected
      ? 'CONNECTED'
      : analyticsStatus === 'loading'
        ? 'CONNECTING'
        : analyticsStatus === 'error'
          ? 'API UNAVAILABLE'
          : 'SETUP REQUIRED'
  const maxViews = Math.max(1, ...(daily?.map((day) => day.views) ?? []))

  return (
    <div className="landing-page">
      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="CodeGuard AI home">
          <span className="landing-brand-icon"><ShieldCheck size={21} strokeWidth={2.2} /></span>
          <span>CodeGuard<span>AI</span></span>
        </a>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#platform">Platform</a>
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
        </nav>
        <div className="landing-header-actions">
          <a className="landing-analytics-link" href="/visitors"><Activity size={15} /> Live analytics</a>
          <a className="landing-header-cta" href="/dashboard">Open workspace <ArrowUpRight size={14} /></a>
        </div>
      </header>

      <main>
      <section className="landing-hero">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-grid-pattern" />
        <div className="hero-content">
          <div className="hero-kicker"><span className="kicker-icon"><Sparkles size={13} /></span> CODE INTELLIGENCE, WITH CLARITY</div>
          <h1>Build with confidence.<br /><span>Grow with intention.</span></h1>
          <p className="hero-lede">
            A thoughtful workspace for code quality, career insights, and the signals that help your product grow.
          </p>
          <div className="hero-actions">
            <a className="primary-cta" href="/dashboard">Explore the workspace <ArrowRight size={16} /></a>
            <a className="secondary-cta" href="#platform">Discover the platform <ArrowDown size={15} /></a>
          </div>
          <div className="hero-assurance">
            <span><Check size={13} /> Clear, useful insights</span>
            <span><Check size={13} /> Privacy-minded by design</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="CodeGuard AI platform preview">
          <div className="visual-orbit orbit-large" />
          <div className="visual-orbit orbit-small" />
          <div className="preview-window">
            <div className="preview-topbar">
              <div className="preview-dots"><i /><i /><i /></div>
              <span>CODEGUARD / WORKSPACE</span>
              <span className="preview-shield"><ShieldCheck size={15} /></span>
            </div>
            <div className="preview-body">
              <div className="preview-sidebar">
                <span className="preview-side-logo"><ShieldCheck size={15} /></span>
                <i className="preview-side-active"><Activity size={14} /></i>
                <i><Braces size={14} /></i>
                <i><FileText size={14} /></i>
              </div>
              <div className="preview-main">
                <div className="preview-title-row">
                  <div><small>YOUR WORKSPACE</small><strong>A clearer view</strong></div>
                  <span className="preview-live"><i /> {connectionLabel}</span>
                </div>
                <div className="preview-stats">
                  <div className="preview-stat"><span>ACTIVE VIEWERS</span><strong>{isConnected && activeViewers !== undefined ? activeViewers.toLocaleString() : '—'}</strong><small>Live audience</small></div>
                  <div className="preview-stat"><span>CODE INSIGHTS</span><strong className="preview-dash">READY</strong><small>Local checks</small></div>
                </div>
                <div className="preview-chart">
                  <div className="preview-chart-heading"><span>VISITOR ACTIVITY</span><span>LAST 7 DAYS</span></div>
                  <div className="chart-bars" aria-hidden="true">
                    {isConnected && daily?.length
                      ? daily.map((day) => (
                          <i
                            key={day.date}
                            title={`${day.views} page views`}
                            style={{ height: day.views ? `${Math.max(4, (day.views / maxViews) * 100)}%` : '0%' }}
                          />
                        ))
                      : null}
                  </div>
                  {!isConnected && <div className="preview-chart-empty">Connect Supabase to see real activity</div>}
                  <div className="preview-chart-foot"><span>Anonymous by default</span><span>Updated every 30 sec</span></div>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-note note-top"><span className="note-icon purple"><Fingerprint size={16} /></span><span><strong>Privacy first</strong><small>No personal data collected</small></span></div>
          <div className="floating-note note-bottom"><span className="note-icon green"><Users size={16} /></span><span><strong>{isConnected && activeViewers !== undefined ? `${activeViewers.toLocaleString()} active now` : 'Live audience insights'}</strong><small>{isConnected ? 'Connected to your workspace' : 'Configure Supabase to connect'}</small></span><i className="note-live-dot" /></div>
        </div>
        <div className="hero-bottom-line"><span>INTELLIGENCE THAT WORKS WITH YOU</span><span>SCROLL TO EXPLORE <ArrowDown size={12} /></span></div>
      </section>

      <section className="trust-strip" aria-label="Platform principles">
        <span>BUILT AROUND WHAT MATTERS</span>
        <div><ShieldCheck size={17} /> Thoughtful by design</div>
        <div><Fingerprint size={17} /> Privacy-minded analytics</div>
        <div><Activity size={17} /> Real data, never demos</div>
      </section>

      <section className="platform-section" id="platform">
        <div className="section-intro">
          <div className="section-kicker">ONE CONNECTED WORKSPACE</div>
          <h2>Focused tools for your<br /><span>next step forward.</span></h2>
          <p>Explore live audience analytics, browser-based code checks, and practical resume feedback without requiring external analysis services.</p>
        </div>
        <div className="feature-grid">
          <article className="feature-card feature-card-live">
            <div className="feature-card-top"><span className="feature-icon analytics-feature"><Activity size={19} /></span><span className={`feature-status ${isConnected ? 'live-status' : 'future-status'}`}>{isConnected ? <><i /> CONNECTED</> : connectionLabel}</span></div>
            <h3>Visitor analytics</h3>
            <p>Understand your audience with live viewers, unique visitors, and page activity once your Supabase project is connected.</p>
            <a href="/visitors">Explore analytics <ArrowRight size={14} /></a>
            <div className="feature-visual analytics-visual" aria-hidden="true">
              <div className="analytics-visual-label"><span>LIVE VIEWERS</span><strong>{isConnected && activeViewers !== undefined ? activeViewers.toLocaleString() : '—'}</strong></div>
              <div className="visual-wave wave-a" /><div className="visual-wave wave-b" /><div className="visual-wave wave-c" />
            </div>
          </article>
          <article className="feature-card">
            <div className="feature-card-top"><span className="feature-icon code-feature"><Braces size={19} /></span><span className="feature-status live-status"><i /> READY · LOCAL</span></div>
            <h3>Code analysis</h3>
            <p>Run quick static checks for common risk hints and maintainability issues directly in your browser.</p>
            <a href="/code-analysis">Analyze code <ArrowRight size={14} /></a>
            <div className="feature-visual code-visual" aria-hidden="true"><div className="code-line"><i>01</i><b>function</b> reviewCode<span>()</span> {'{'}</div><div className="code-line"><i>02</i><span className="code-indent" /> return <em>clear insights</em></div><div className="code-line"><i>03</i>{'}'}</div><div className="code-cursor" /></div>
          </article>
          <article className="feature-card">
            <div className="feature-card-top"><span className="feature-icon career-feature"><FileText size={19} /></span><span className="feature-status live-status"><i /> READY · LOCAL</span></div>
            <h3>Resume analyzer</h3>
            <p>Review resume structure, measurable accomplishments, and keywords from a target job description.</p>
            <a href="/resume-analyzer">Review resume <ArrowRight size={14} /></a>
            <div className="feature-visual career-visual" aria-hidden="true"><div className="resume-paper"><span /><span /><span /><i /><span /><span /></div><div className="resume-spark"><Sparkles size={17} /></div></div>
          </article>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="how-intro">
          <div className="section-kicker">A CLEARER WAY TO START</div>
          <h2>Simple to explore.<br /><span>Honest about what's next.</span></h2>
          <p>{isConnected ? 'Visitor analytics is connected and reporting real activity.' : 'Visitor analytics is ready to connect once Supabase and the Node API are configured.'} Code and resume reviews run locally in your browser.</p>
          <a className="text-cta" href="/dashboard">Open the workspace <ArrowUpRight size={15} /></a>
        </div>
        <div className="steps-list">
          <article className="step-card"><span className="step-number">01</span><div className="step-icon"><GitBranch size={18} /></div><div><h3>Connect your foundation</h3><p>Configure your Supabase project and run the analytics migration.</p></div><span className="step-badge">{isConnected ? 'COMPLETE' : 'YOU ARE HERE'}</span></article>
          <article className="step-card"><span className="step-number">02</span><div className="step-icon"><Activity size={18} /></div><div><h3>See real audience activity</h3><p>View anonymous visitor counts and daily page activity in one place.</p></div>{isConnected ? <span className="step-check"><Check size={14} /></span> : <span className="step-badge future-badge">NEXT</span>}</article>
          <article className="step-card"><span className="step-number">03</span><div className="step-icon"><Sparkles size={18} /></div><div><h3>Review code and resumes</h3><p>Use the browser-based analysis tools without connecting an external service.</p></div><span className="step-badge">READY</span></article>
        </div>
      </section>

      <section className="privacy-section" id="privacy">
        <div className="privacy-emblem"><Fingerprint size={28} /></div>
        <div className="privacy-copy"><div className="section-kicker">PRIVACY BY DEFAULT</div><h2>Useful numbers.<br /><span>No personal profiles.</span></h2><p>The viewer counter uses anonymous browser identifiers and reports only aggregate counts. Supabase service credentials stay on the Node.js backend.</p></div>
        <div className="privacy-points"><div><Check size={15} /><span>No names or emails collected</span></div><div><Check size={15} /><span>Raw visitor records stay private</span></div><div><Check size={15} /><span>Server-side Supabase credentials</span></div></div>
      </section>

      <section className="closing-cta">
        <div><div className="section-kicker">START WITH WHAT'S READY</div><h2>Take a clearer look<br />at your workspace.</h2><p>Explore the live visitor analytics dashboard and see how CodeGuard AI is taking shape.</p></div>
        <a className="primary-cta" href="/dashboard">Open CodeGuard AI <ArrowRight size={16} /></a>
        <div className="closing-glow" />
      </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-brand footer-brand" href="/"><span className="landing-brand-icon"><ShieldCheck size={19} /></span><span>CodeGuard<span>AI</span></span></a>
        <span>Thoughtful software starts with clarity.</span>
        <nav aria-label="Footer navigation"><a href="#platform">Platform</a><a href="/visitors">Visitor analytics</a><a href="#privacy">Privacy</a></nav>
        <small>© 2026 CodeGuard AI</small>
      </footer>
    </div>
  )
}

export default LandingPage
