import { CHANNELS, DATA, MONTHS, REGIONS, type Row } from './mockData'

export const METRICS = ['revenue', 'orders', 'users'] as const
export const DIMENSIONS = ['channel', 'region', 'month'] as const
export const QUARTERS = ['all', 'Q1', 'Q2', 'Q3', 'Q4'] as const

export type Metric = (typeof METRICS)[number]
export type Dimension = (typeof DIMENSIONS)[number]
export type Quarter = (typeof QUARTERS)[number]

export interface Scope {
  quarter?: Quarter
  channel?: string
  region?: string
}

export interface QueryInput extends Scope {
  metric: Metric
  groupBy: Dimension
}

export interface ResultRow {
  key: string
  value: number
}

const QUARTER_MONTHS: Record<Exclude<Quarter, 'all'>, string[]> = {
  Q1: MONTHS.slice(0, 3),
  Q2: MONTHS.slice(3, 6),
  Q3: MONTHS.slice(6, 9),
  Q4: MONTHS.slice(9, 12),
}

export function listMetrics() {
  return {
    metrics: [...METRICS],
    dimensions: [...DIMENSIONS],
    quarters: [...QUARTERS],
    channels: [...CHANNELS],
    regions: [...REGIONS],
    months: [...MONTHS],
    note: 'Data covers calendar year 2025. revenue is in USD.',
  }
}

export function filterRows(scope: Scope = {}): Row[] {
  const months = scope.quarter && scope.quarter !== 'all' ? QUARTER_MONTHS[scope.quarter] : null
  return DATA.filter(
    (r) =>
      (!months || months.includes(r.month)) &&
      (!scope.channel || r.channel === scope.channel) &&
      (!scope.region || r.region === scope.region),
  )
}

export function total(metric: Metric, scope: Scope = {}): number {
  return filterRows(scope).reduce((sum, r) => sum + r[metric], 0)
}

export function queryMetrics({ metric, groupBy, ...scope }: QueryInput): ResultRow[] {
  const acc = new Map<string, number>()
  for (const r of filterRows(scope)) {
    acc.set(r[groupBy], (acc.get(r[groupBy]) ?? 0) + r[metric])
  }
  const rows = [...acc].map(([key, value]) => ({ key, value }))
  // Months stay chronological; everything else is sorted largest first.
  return groupBy === 'month' ? rows.sort((a, b) => a.key.localeCompare(b.key)) : rows.sort((a, b) => b.value - a.value)
}

export interface CompareRow {
  key: string
  a: number
  b: number
  delta: number
  pctChange: number | null
}

export function comparePeriods(input: {
  metric: Metric
  groupBy: Exclude<Dimension, 'month'>
  periodA: Exclude<Quarter, 'all'>
  periodB: Exclude<Quarter, 'all'>
  channel?: string
  region?: string
}): CompareRow[] {
  const { metric, groupBy, periodA, periodB, ...rest } = input
  const a = new Map(queryMetrics({ metric, groupBy, quarter: periodA, ...rest }).map((r) => [r.key, r.value]))
  const b = new Map(queryMetrics({ metric, groupBy, quarter: periodB, ...rest }).map((r) => [r.key, r.value]))
  const keys = new Set([...a.keys(), ...b.keys()])
  return [...keys]
    .map((key) => {
      const va = a.get(key) ?? 0
      const vb = b.get(key) ?? 0
      return { key, a: va, b: vb, delta: vb - va, pctChange: va === 0 ? null : ((vb - va) / va) * 100 }
    })
    .sort((x, y) => y.delta - x.delta)
}

export function formatValue(metric: Metric, v: number): string {
  return metric === 'revenue' ? `$${Math.round(v).toLocaleString('en-US')}` : Math.round(v).toLocaleString('en-US')
}
