import { useSyncExternalStore } from 'react'
import type { Dimension, Metric, Quarter } from '../data/queries'

export type ChartType = 'bar' | 'line' | 'pie'

export interface ChartSpec {
  metric: Metric
  groupBy: Dimension
  chartType: ChartType
  /** When set (and filters.quarter is a specific quarter), the chart shows two quarters side by side. */
  compareTo: Quarter | null
}

export interface Filters {
  quarter: Quarter
  channel: string // '' = all
  region: string // '' = all
}

export interface LogEntry {
  id: number
  time: string
  source: 'agent' | 'user'
  text: string
}

export interface Insight {
  id: number
  time: string
  text: string
}

export type PulseTarget = 'chart' | 'filters' | 'insights'

export interface WebMcpStatus {
  state: 'pending' | 'unsupported' | 'registered' | 'error'
  tools: string[]
  detail?: string
}

export interface DashboardState {
  chart: ChartSpec
  filters: Filters
  log: LogEntry[]
  insights: Insight[]
  /** Bumps every time an agent changes something, so the matching panel can flash. */
  pulse: { id: number; target: PulseTarget | null }
  /** How many times an agent has successfully run each tool (drives the demo checklist). */
  toolCalls: Record<string, number>
  webmcp: WebMcpStatus
}

export const DEFAULT_CHART: ChartSpec = { metric: 'revenue', groupBy: 'month', chartType: 'line', compareTo: null }
export const DEFAULT_FILTERS: Filters = { quarter: 'all', channel: '', region: '' }

export function isDefaultView(s: DashboardState): boolean {
  return (
    s.chart.metric === DEFAULT_CHART.metric && s.chart.groupBy === DEFAULT_CHART.groupBy &&
    s.chart.chartType === DEFAULT_CHART.chartType && s.chart.compareTo === null &&
    s.filters.quarter === DEFAULT_FILTERS.quarter && s.filters.channel === '' && s.filters.region === ''
  )
}

// Plain external store so React components and WebMCP tools share one source of truth.
let state: DashboardState = {
  chart: { ...DEFAULT_CHART },
  filters: { ...DEFAULT_FILTERS },
  log: [],
  insights: [],
  pulse: { id: 0, target: null },
  toolCalls: {},
  webmcp: { state: 'pending', tools: [] },
}
let logId = 0
let insightId = 0
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

const now = () => new Date().toLocaleTimeString()

export const dashboardStore = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  setChart(patch: Partial<ChartSpec>) {
    state = { ...state, chart: { ...state.chart, ...patch } }
    emit()
  },
  setFilters(patch: Partial<Filters>) {
    state = { ...state, filters: { ...state.filters, ...patch } }
    emit()
  },
  resetView() {
    state = { ...state, chart: { ...DEFAULT_CHART }, filters: { ...DEFAULT_FILTERS } }
    emit()
  },
  countToolCall(name: string) {
    state = { ...state, toolCalls: { ...state.toolCalls, [name]: (state.toolCalls[name] ?? 0) + 1 } }
    emit()
  },
  /** Back to a clean slate for the next demo run. Leaves the WebMCP connection status alone. */
  resetDemo() {
    state = {
      ...state,
      chart: { ...DEFAULT_CHART },
      filters: { ...DEFAULT_FILTERS },
      log: [],
      insights: [],
      pulse: { id: 0, target: null },
      toolCalls: {},
    }
    emit()
  },
  addInsight(text: string) {
    state = { ...state, insights: [{ id: ++insightId, time: now(), text }, ...state.insights].slice(0, 20) }
    emit()
  },
  removeInsight(id: number) {
    state = { ...state, insights: state.insights.filter((i) => i.id !== id) }
    emit()
  },
  clearInsights() {
    state = { ...state, insights: [] }
    emit()
  },
  pulse(target: PulseTarget) {
    state = { ...state, pulse: { id: state.pulse.id + 1, target } }
    emit()
  },
  setWebMcp(webmcp: WebMcpStatus) {
    state = { ...state, webmcp }
    emit()
  },
  addLog(source: LogEntry['source'], text: string) {
    const entry: LogEntry = { id: ++logId, time: now(), source, text }
    state = { ...state, log: [entry, ...state.log].slice(0, 50) }
    emit()
  },
}

export function useDashboard(): DashboardState {
  return useSyncExternalStore(dashboardStore.subscribe, dashboardStore.getState)
}
