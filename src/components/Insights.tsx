import { dashboardStore, useDashboard } from '../store/dashboardStore'
import { Pulse } from './Pulse'

export function Insights() {
  const { insights } = useDashboard()
  return (
    <div className="panel insights pulse-host">
      <Pulse target="insights" />
      <div className="panel-head">
        <h2>Insights</h2>
        {insights.length > 0 && (
          <button className="link" onClick={() => dashboardStore.clearInsights()}>Clear all</button>
        )}
      </div>
      {insights.length === 0 ? (
        <p className="empty">Findings the agent pins will appear here.</p>
      ) : (
        <ul>
          {insights.map((i) => (
            <li key={i.id}>
              <span className="time">{i.time}</span>
              {i.text}
              <button className="link x" aria-label="Dismiss insight" onClick={() => dashboardStore.removeInsight(i.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
