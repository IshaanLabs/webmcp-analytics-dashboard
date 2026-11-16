import { useEffect } from 'react'
import { ChartPanel } from './components/ChartPanel'
import { DemoGuide } from './components/DemoGuide'
import { Filters } from './components/Filters'
import { Insights } from './components/Insights'
import { KpiCards } from './components/KpiCards'
import { ToolLog } from './components/ToolLog'
import { useDashboard } from './store/dashboardStore'
import { registerWebMcpTools } from './webmcp/registerTools'

export default function App() {
  const { webmcp } = useDashboard()

  useEffect(() => registerWebMcpTools(), [])

  const label =
    webmcp.state === 'registered' ? `${webmcp.tools.length} tools exposed to agents`
    : webmcp.state === 'unsupported' ? 'WebMCP unavailable'
    : webmcp.state === 'error' ? 'Tool registration failed'
    : 'Connecting…'

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
            </svg>
          </div>
          <div>
            <h1>Insight</h1>
            <div className="subtitle">Sales analytics · 2025 · mock data · controlled by WebMCP</div>
          </div>
        </div>
        <span className={`badge ${webmcp.state}`} title={webmcp.detail ?? webmcp.tools.join(', ')} role="status">
          <i className="status-dot" /> {label}
        </span>
      </header>

      {webmcp.state === 'unsupported' && (
        <div className="banner" role="alert">
          <strong>This browser has no WebMCP.</strong> The dashboard still works by hand, but agents can't see its tools.
          Use desktop Chrome with <code>chrome://flags/#enable-webmcp-testing</code> enabled, then reload this page.
        </div>
      )}

      <DemoGuide />
      <Filters />
      <KpiCards />
      <div className="main">
        <ChartPanel />
        <div className="side">
          <Insights />
          <ToolLog />
        </div>
      </div>
      <footer>
        Tools registered on <code>document.modelContext</code> · dynamic tools appear only when they make sense
      </footer>
    </div>
  )
}
