import { useDashboard } from '../store/dashboardStore'

/** Splits "render_chart {json}" into the tool name and its arguments for nicer display. */
function parse(text: string) {
  const m = text.match(/^([a-z_]+)(?: (failed: .*|\{.*\}))?$/s)
  return m ? { name: m[1], rest: m[2] ?? '' } : null
}

export function ToolLog() {
  const { log } = useDashboard()
  return (
    <div className="panel log">
      <div className="panel-head">
        <h2>Activity</h2>
        <span className="legend"><i className="dot agent" /> agent <i className="dot user" /> you</span>
      </div>
      {log.length === 0 ? (
        <p className="empty">No activity yet. Change a filter, or ask the agent something.</p>
      ) : (
        <ul>
          {log.map((e) => {
            const p = e.source === 'agent' ? parse(e.text) : null
            const failed = p?.rest.startsWith('failed:')
            return (
              <li key={e.id} className={`${e.source}${failed ? ' failed' : ''}`}>
                <span className="time">{e.time} · {e.source}</span>
                {p ? (
                  <>
                    <code className="tool-name">{p.name}</code>
                    {p.rest && <span className="args">{p.rest}</span>}
                  </>
                ) : (
                  e.text
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
