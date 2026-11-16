import { METRICS, formatValue, total, type Quarter } from '../data/queries'
import { useDashboard } from '../store/dashboardStore'

const PREVIOUS: Record<Quarter, Quarter | null> = { all: null, Q1: null, Q2: 'Q1', Q3: 'Q2', Q4: 'Q3' }

export function KpiCards() {
  const { filters } = useDashboard()
  const base = { channel: filters.channel || undefined, region: filters.region || undefined }
  const prev = PREVIOUS[filters.quarter]

  return (
    <div className="kpis">
      {METRICS.map((m) => {
        const value = total(m, { ...base, quarter: filters.quarter })
        const before = prev ? total(m, { ...base, quarter: prev }) : null
        const change = before ? ((value - before) / before) * 100 : null
        return (
          <div className="panel kpi" key={m}>
            <div className="label">Total {m}</div>
            <div className="value">{formatValue(m, value)}</div>
            <div className={`delta ${change === null ? 'none' : change >= 0 ? 'up' : 'down'}`}>
              {change === null
                ? filters.quarter === 'all' ? 'Full year 2025' : 'First quarter of 2025'
                : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}% vs ${prev}`}
            </div>
          </div>
        )
      })}
    </div>
  )
}
