import {
  ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LineElement,
  LinearScale, PointElement, Tooltip,
} from 'chart.js'
import { Bar, Line, Pie } from 'react-chartjs-2'
import { DIMENSIONS, METRICS, formatValue, queryMetrics, type Dimension, type Metric } from '../data/queries'
import { dashboardStore, useDashboard, type ChartType } from '../store/dashboardStore'
import { Pulse } from './Pulse'

ChartJS.register(ArcElement, BarElement, CategoryScale, Legend, LineElement, LinearScale, PointElement, Tooltip)

const PALETTE = ['#3b5bdb', '#0b7a5a', '#e8590c', '#ae3ec9', '#1098ad', '#c2255c']
const CHART_TYPES: ChartType[] = ['bar', 'line', 'pie']

export function ChartPanel() {
  const { chart, filters } = useDashboard()
  const scope = { channel: filters.channel || undefined, region: filters.region || undefined }
  const rows = queryMetrics({ metric: chart.metric, groupBy: chart.groupBy, quarter: filters.quarter, ...scope })

  // Two-quarter comparison only makes sense for a specific, different quarter and non-pie, non-month charts.
  const comparing =
    chart.compareTo !== null && filters.quarter !== 'all' && filters.quarter !== chart.compareTo &&
    chart.groupBy !== 'month' && chart.chartType !== 'pie'
  const otherRows = comparing
    ? new Map(queryMetrics({ metric: chart.metric, groupBy: chart.groupBy, quarter: chart.compareTo!, ...scope }).map((r) => [r.key, r.value]))
    : null

  const single = chart.chartType === 'line'
  const datasets = [
    {
      label: comparing ? filters.quarter : chart.metric,
      data: rows.map((r) => r.value),
      backgroundColor: single || comparing ? PALETTE[0] : rows.map((_, i) => PALETTE[i % PALETTE.length]),
      borderColor: single || comparing ? PALETTE[0] : rows.map((_, i) => PALETTE[i % PALETTE.length]),
      tension: 0.25,
    },
    ...(otherRows
      ? [{
          label: chart.compareTo as string,
          data: rows.map((r) => otherRows.get(r.key) ?? 0),
          backgroundColor: PALETTE[2],
          borderColor: PALETTE[2],
          tension: 0.25,
        }]
      : []),
  ]
  const data = { labels: rows.map((r) => r.key), datasets }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: chart.chartType === 'pie' || comparing },
      tooltip: { callbacks: { label: (c: { raw: unknown }) => formatValue(chart.metric, Number(c.raw)) } },
    },
  }

  const user = (patch: Parameters<typeof dashboardStore.setChart>[0], text: string) => {
    dashboardStore.setChart(patch)
    dashboardStore.addLog('user', text)
  }

  const title = `${chart.metric[0].toUpperCase() + chart.metric.slice(1)} by ${chart.groupBy}`

  return (
    <div className="panel pulse-host">
      <Pulse target="chart" />
      <div className="chart-head">
        <div>
          <h2>
            {title}
            {comparing && <span className="chip">{filters.quarter} vs {chart.compareTo}</span>}
          </h2>
          <div className="scope">
            {filters.quarter === 'all' ? 'Full year 2025' : `${filters.quarter} 2025`} · {filters.channel || 'All channels'} · {filters.region || 'All regions'}
          </div>
        </div>
        <div className="filters" style={{ margin: 0 }}>
          <select value={chart.metric} onChange={(e) => user({ metric: e.target.value as Metric }, `Metric set to ${e.target.value}`)}>
            {METRICS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={chart.groupBy} onChange={(e) => user({ groupBy: e.target.value as Dimension }, `Grouped by ${e.target.value}`)}>
            {DIMENSIONS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select value={chart.chartType} onChange={(e) => user({ chartType: e.target.value as ChartType }, `Chart type set to ${e.target.value}`)}>
            {CHART_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="chart-wrap">
        {chart.chartType === 'bar' && <Bar data={data} options={options} />}
        {chart.chartType === 'line' && <Line data={data} options={options} />}
        {chart.chartType === 'pie' && <Pie data={data} options={options} />}
      </div>
    </div>
  )
}
