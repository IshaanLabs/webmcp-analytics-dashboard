import { CHANNELS, REGIONS } from '../data/mockData'
import { QUARTERS, type Quarter } from '../data/queries'
import { dashboardStore, useDashboard } from '../store/dashboardStore'
import { Pulse } from './Pulse'

export function Filters() {
  const { filters } = useDashboard()
  const change = (patch: Parameters<typeof dashboardStore.setFilters>[0], text: string) => {
    dashboardStore.setFilters(patch)
    dashboardStore.addLog('user', text)
  }

  return (
    <div className="filters pulse-host">
      <Pulse target="filters" />
      <label>
        Period
        <select
          value={filters.quarter}
          onChange={(e) => change({ quarter: e.target.value as Quarter }, `Period set to ${e.target.value}`)}
        >
          {QUARTERS.map((q) => (
            <option key={q} value={q}>{q === 'all' ? 'Full year' : q}</option>
          ))}
        </select>
      </label>
      <label>
        Channel
        <select value={filters.channel} onChange={(e) => change({ channel: e.target.value }, `Channel set to ${e.target.value || 'all'}`)}>
          <option value="">All channels</option>
          {CHANNELS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label>
        Region
        <select value={filters.region} onChange={(e) => change({ region: e.target.value }, `Region set to ${e.target.value || 'all'}`)}>
          <option value="">All regions</option>
          {REGIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
    </div>
  )
}
