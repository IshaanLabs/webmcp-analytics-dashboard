import { useState } from 'react'
import { dashboardStore, useDashboard } from '../store/dashboardStore'

interface Step {
  prompt: string
  /** The tool the agent is expected to use. A step ticks once that tool has run `min` times. */
  tool: string
  min?: number
}

const STEPS: Step[] = [
  { prompt: 'Compare Q1 and Q4 revenue across channels', tool: 'render_chart' },
  { prompt: 'Which channel grew fastest between Q1 and Q4? Pin the finding.', tool: 'add_insight' },
  { prompt: 'Drill into the top channel', tool: 'drill_down' },
  { prompt: 'Show orders by region as a pie chart', tool: 'render_chart', min: 3 },
  { prompt: 'Export what I am looking at', tool: 'export_report' },
  { prompt: 'Reset the dashboard', tool: 'reset_dashboard' },
]

export function DemoGuide() {
  const { toolCalls } = useDashboard()
  const [copied, setCopied] = useState<string | null>(null)
  const done = STEPS.map((s) => (toolCalls[s.tool] ?? 0) >= (s.min ?? 1))

  async function copy(p: string) {
    try {
      await navigator.clipboard.writeText(p)
      setCopied(p)
      setTimeout(() => setCopied((c) => (c === p ? null : c)), 1500)
    } catch {
      // Clipboard can be blocked; the prompt text is still visible to copy by hand.
    }
  }

  return (
    <section className="panel demo" aria-label="Try asking the agent">
      <div className="panel-head">
        <h2>Try asking the agent</h2>
        <button className="link" onClick={() => dashboardStore.resetDemo()}>Reset demo</button>
      </div>
      <p className="hint">Click a prompt to copy it, paste it into the agent, and watch the dashboard respond.</p>
      <ol>
        {STEPS.map((s, i) => (
          <li key={s.prompt} className={done[i] ? 'done' : ''}>
            <span className="tick" aria-label={done[i] ? 'done' : 'not done yet'}>{done[i] ? '✓' : i + 1}</span>
            <button className="prompt-chip" onClick={() => copy(s.prompt)}>
              {copied === s.prompt ? 'Copied ✓' : s.prompt}
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
