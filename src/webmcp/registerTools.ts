import { CHANNELS, REGIONS } from '../data/mockData'
import {
  DIMENSIONS, METRICS, QUARTERS, comparePeriods, formatValue, listMetrics, queryMetrics,
  type Dimension, type Metric, type Quarter,
} from '../data/queries'
import {
  dashboardStore, isDefaultView, type ChartType, type DashboardState, type Filters, type PulseTarget,
} from '../store/dashboardStore'
import { schemas } from './schemas'

type Args = Record<string, unknown>
interface ToolResult {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}
interface Client {
  requestUserInteraction?: <T>(cb: () => Promise<T> | T) => Promise<T>
}
interface Tool {
  name: string
  description: string
  inputSchema: object
  annotations?: { readOnlyHint?: boolean }
  execute: (args: Args, client?: Client) => Promise<ToolResult> | ToolResult
}
// The WebMCP API is still changing and has no TS lib types yet, so keep the surface minimal.
interface ModelContextLike {
  registerTool: (tool: Tool, options?: { signal?: AbortSignal }) => unknown
  unregisterTool?: (name: string) => void
}

const CHART_TYPES: ChartType[] = ['bar', 'line', 'pie']
type Period = Exclude<Quarter, 'all'>

function getModelContext(): ModelContextLike | undefined {
  const d = (document as unknown as { modelContext?: ModelContextLike }).modelContext
  const n = (navigator as unknown as { modelContext?: ModelContextLike }).modelContext
  return d ?? n
}

const ok = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })
const fail = (message: string): ToolResult => ({ content: [{ type: 'text', text: message }], isError: true })

// Returns an error message if `value` is present but not one of `allowed`.
function bad(name: string, value: unknown, allowed: readonly string[]): string | null {
  if (value === undefined || value === null || value === '') return null
  return allowed.includes(String(value)) ? null : `Invalid ${name} "${String(value)}". Allowed: ${allowed.join(', ')}.`
}
const firstError = (...errs: (string | null)[]) => errs.find((e) => e !== null) ?? null

const all = (v: unknown) => (v === undefined || v === null || v === '' || v === 'All' ? undefined : String(v))

function currentScope() {
  const { filters } = dashboardStore.getState()
  return { quarter: filters.quarter, channel: filters.channel || undefined, region: filters.region || undefined }
}

function applyFilters(a: Args) {
  const f: Partial<Filters> = {}
  if (a.quarter !== undefined) f.quarter = a.quarter as Quarter
  if (a.channel !== undefined) f.channel = all(a.channel) ?? ''
  if (a.region !== undefined) f.region = all(a.region) ?? ''
  if (Object.keys(f).length) dashboardStore.setFilters(f)
}

const pct = (v: number | null) => (v === null ? 'n/a' : `${v >= 0 ? '+' : ''}${(Math.round(v * 10) / 10).toFixed(1)}%`)

function lines(metric: Metric, groupBy: Dimension) {
  return queryMetrics({ metric, groupBy, ...currentScope() }).map((r) => `${r.key}: ${formatValue(metric, r.value)}`)
}

function csvFor(): string {
  const { chart } = dashboardStore.getState()
  const rows = queryMetrics({ metric: chart.metric, groupBy: chart.groupBy, ...currentScope() })
  return [`${chart.groupBy},${chart.metric}`, ...rows.map((r) => `${r.key},${r.value}`)].join('\n')
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Static tools: always available.
// ---------------------------------------------------------------------------
const staticTools: Tool[] = [
  {
    name: 'list_metrics',
    description:
      'List the metrics, dimensions, channels, regions and time range of the sales dashboard. Only call this if unsure; every valid value is already listed in the other tools\' schemas.',
    inputSchema: schemas.list_metrics,
    annotations: { readOnlyHint: true },
    execute: () => ok(listMetrics()),
  },
  {
    name: 'query_metrics',
    description:
      'Look up numbers WITHOUT changing the screen. Use only for pure questions where no chart is wanted. If the user asks to show, chart or compare something, use render_chart instead.',
    inputSchema: schemas.query_metrics,
    annotations: { readOnlyHint: true },
    execute: (a) => {
      const err = firstError(
        bad('metric', a.metric, METRICS), bad('groupBy', a.groupBy, DIMENSIONS),
        bad('quarter', a.quarter, QUARTERS), bad('channel', a.channel, ['All', ...CHANNELS]),
        bad('region', a.region, ['All', ...REGIONS]),
      )
      if (err) return fail(err)
      const metric = a.metric as Metric
      const rows = queryMetrics({
        metric, groupBy: a.groupBy as Dimension, quarter: (a.quarter as Quarter) ?? 'all',
        channel: all(a.channel), region: all(a.region),
      })
      return ok({ metric, values: rows.map((r) => `${r.key}: ${formatValue(metric, r.value)}`) })
    },
  },
  {
    name: 'compare_periods',
    description:
      'Numbers only: compare one metric between two quarters per channel or region, with change and percent change, biggest increase first. Use for "who grew most" style questions. To also SHOW the comparison, use render_chart with compareTo.',
    inputSchema: schemas.compare_periods,
    annotations: { readOnlyHint: true },
    execute: (a) => {
      const err = firstError(
        bad('metric', a.metric, METRICS), bad('groupBy', a.groupBy, ['channel', 'region']),
        bad('periodA', a.periodA, ['Q1', 'Q2', 'Q3', 'Q4']), bad('periodB', a.periodB, ['Q1', 'Q2', 'Q3', 'Q4']),
        bad('channel', a.channel, ['All', ...CHANNELS]), bad('region', a.region, ['All', ...REGIONS]),
      )
      if (err) return fail(err)
      const metric = a.metric as Metric
      const rows = comparePeriods({
        metric, groupBy: a.groupBy as 'channel' | 'region',
        periodA: a.periodA as Period, periodB: a.periodB as Period, channel: all(a.channel), region: all(a.region),
      })
      return ok({
        values: rows.map((r) => `${r.key}: ${a.periodA} ${formatValue(metric, r.a)} -> ${a.periodB} ${formatValue(metric, r.b)} (${pct(r.pctChange)})`),
      })
    },
  },
  {
    name: 'render_chart',
    description:
      'PRIMARY tool. Use it for ANY request to show, chart, plot, compare or visualize data: call it directly, without looking the data up first. It updates the dashboard the user is looking at and returns the values now shown, so you can answer from them. To compare two quarters, set `quarter` and `compareTo` to get one grouped bar chart.',
    inputSchema: schemas.render_chart,
    execute: (a) => {
      const err = firstError(
        bad('metric', a.metric, METRICS), bad('groupBy', a.groupBy, DIMENSIONS), bad('chartType', a.chartType, CHART_TYPES),
        bad('quarter', a.quarter, QUARTERS), bad('compareTo', a.compareTo, ['Q1', 'Q2', 'Q3', 'Q4']),
        bad('channel', a.channel, ['All', ...CHANNELS]), bad('region', a.region, ['All', ...REGIONS]),
      )
      if (err) return fail(err)
      const metric = a.metric as Metric
      const groupBy = a.groupBy as Dimension
      const quarter = (a.quarter as Quarter | undefined) ?? dashboardStore.getState().filters.quarter
      const compareTo = (a.compareTo as Period | undefined) ?? null
      if (compareTo) {
        if (quarter === 'all') return fail("compareTo needs a specific quarter (Q1-Q4) in `quarter`.")
        if (quarter === compareTo) return fail('`quarter` and `compareTo` must be different quarters.')
        if (groupBy === 'month') return fail('Comparing two quarters needs groupBy channel or region.')
      }
      let chartType = (a.chartType as ChartType | undefined) ?? (groupBy === 'month' ? 'line' : 'bar')
      if (compareTo && chartType === 'pie') chartType = 'bar'
      dashboardStore.setChart({ metric, groupBy, chartType, compareTo })
      applyFilters(a)

      const scope = currentScope()
      const values = compareTo
        ? comparePeriods({
            metric, groupBy: groupBy as 'channel' | 'region', periodA: quarter as Period, periodB: compareTo,
            channel: scope.channel, region: scope.region,
          }).map((r) => `${r.key}: ${quarter} ${formatValue(metric, r.a)} -> ${compareTo} ${formatValue(metric, r.b)} (${pct(r.pctChange)})`)
        : lines(metric, groupBy)
      return ok({ shown: { metric, groupBy, chartType, quarter: scope.quarter, compareTo, channel: scope.channel ?? 'All', region: scope.region ?? 'All' }, values })
    },
  },
  {
    name: 'set_filters',
    description: "Change the dashboard's quarter, channel and region filters without redrawing the chart type. Omitted fields stay unchanged. Use 'All' to clear a channel or region filter.",
    inputSchema: schemas.set_filters,
    execute: (a) => {
      const err = firstError(
        bad('quarter', a.quarter, QUARTERS), bad('channel', a.channel, ['All', ...CHANNELS]),
        bad('region', a.region, ['All', ...REGIONS]),
      )
      if (err) return fail(err)
      applyFilters(a)
      const f = dashboardStore.getState().filters
      return ok({ filters: { quarter: f.quarter, channel: f.channel || 'All', region: f.region || 'All' } })
    },
  },
  {
    name: 'add_insight',
    description:
      'Pin a short written finding (one or two sentences with the key numbers) to the dashboard\'s Insights panel, so the user keeps it. Call this after you have analysed data and reached a conclusion worth keeping.',
    inputSchema: schemas.add_insight,
    execute: (a) => {
      const text = typeof a.text === 'string' ? a.text.trim().slice(0, 300) : ''
      if (!text) return fail('`text` is required and must be a non-empty string.')
      dashboardStore.addInsight(text)
      return ok({ pinned: true, total: dashboardStore.getState().insights.length })
    },
  },
  {
    name: 'export_report',
    description:
      'Download the data currently shown on the chart as a CSV file. This asks the human user to confirm before anything is downloaded.',
    inputSchema: schemas.export_report,
    execute: async (_a, client) => {
      const { chart } = dashboardStore.getState()
      const ask = async () => window.confirm(`An agent wants to download a CSV of "${chart.metric} by ${chart.groupBy}". Allow?`)
      const approved = client?.requestUserInteraction ? await client.requestUserInteraction(ask) : await ask()
      if (!approved) return fail('The user declined the export. Nothing was downloaded.')
      download(`report-${chart.metric}-by-${chart.groupBy}.csv`, csvFor())
      return ok({ exported: true, file: `report-${chart.metric}-by-${chart.groupBy}.csv` })
    },
  },
]

// ---------------------------------------------------------------------------
// Dynamic tools: only registered while they make sense for the page's current state.
// `signature` returns null when the tool should not exist, otherwise a string that
// changes whenever the tool's definition must change (it is re-registered then).
// ---------------------------------------------------------------------------
interface DynamicSpec {
  name: string
  signature: (s: DashboardState) => string | null
  build: (signature: string) => Tool
}

function buildDrillDown(by: 'channel' | 'region'): Tool {
  const keys: readonly string[] = by === 'channel' ? CHANNELS : REGIONS
  return {
    name: 'drill_down',
    description: `Drill into one ${by} currently shown on the chart: filters the dashboard to it and shows its monthly trend. Only available while the chart is grouped by ${by}.`,
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string', enum: [...keys], description: `The ${by} to drill into.` } },
      required: ['key'],
      additionalProperties: false,
    },
    execute: (a) => {
      if (!a.key) return fail('`key` is required.')
      const err = bad('key', a.key, keys)
      if (err) return fail(err)
      dashboardStore.setFilters({ [by]: String(a.key) })
      dashboardStore.setChart({ groupBy: 'month', chartType: 'line', compareTo: null })
      const metric = dashboardStore.getState().chart.metric
      return ok({ drilledInto: `${by}=${String(a.key)}`, metric, monthly: lines(metric, 'month') })
    },
  }
}

const dynamicSpecs: DynamicSpec[] = [
  {
    name: 'drill_down',
    signature: (s) => (s.chart.groupBy === 'month' ? null : s.chart.groupBy),
    build: (sig) => buildDrillDown(sig as 'channel' | 'region'),
  },
  {
    name: 'reset_dashboard',
    signature: (s) => (isDefaultView(s) ? null : 'on'),
    build: () => ({
      name: 'reset_dashboard',
      description: 'Reset the dashboard to its default view: full year, all channels and regions, monthly revenue line chart. Only available while the view differs from the default.',
      inputSchema: schemas.export_report,
      execute: () => {
        dashboardStore.resetView()
        return ok({ reset: true })
      },
    }),
  },
  {
    name: 'clear_insights',
    signature: (s) => (s.insights.length ? 'on' : null),
    build: () => ({
      name: 'clear_insights',
      description: 'Remove all pinned insights from the Insights panel. Only available while at least one insight is pinned.',
      inputSchema: schemas.export_report,
      execute: () => {
        dashboardStore.clearInsights()
        return ok({ cleared: true })
      },
    }),
  },
]

// Which panel flashes when an agent runs a given tool.
const PULSE: Record<string, PulseTarget> = {
  render_chart: 'chart', drill_down: 'chart', reset_dashboard: 'chart',
  set_filters: 'filters', add_insight: 'insights', clear_insights: 'insights',
}

function describe(args: Args) {
  const s = JSON.stringify(args)
  return s === '{}' ? '' : s
}

function wrap(tool: Tool): Tool {
  return {
    ...tool,
    execute: async (args, client) => {
      dashboardStore.addLog('agent', `${tool.name} ${describe(args)}`.trim())
      const result = await tool.execute(args, client)
      if (result.isError) dashboardStore.addLog('agent', `${tool.name} failed: ${result.content[0].text}`)
      else {
        dashboardStore.countToolCall(tool.name)
        if (PULSE[tool.name]) dashboardStore.pulse(PULSE[tool.name])
      }
      return result
    },
  }
}

/** Registers all tools on the page's WebMCP context. Returns a cleanup function. */
export function registerWebMcpTools(): () => void {
  const mc = getModelContext()
  if (!mc || typeof mc.registerTool !== 'function') {
    dashboardStore.setWebMcp({
      state: 'unsupported', tools: [],
      detail: 'document.modelContext not found. Use Chrome with chrome://flags/#enable-webmcp-testing enabled.',
    })
    return () => {}
  }

  const errors: string[] = []

  // Registers one tool. Removal works through an AbortSignal, with unregister()/unregisterTool() as fallbacks
  // for API versions that use them instead.
  function attach(tool: Tool): { release: () => void; failed: boolean } {
    const ac = new AbortController()
    let handle: unknown
    try {
      handle = mc!.registerTool(wrap(tool), { signal: ac.signal })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // A leftover registration from React StrictMode's double mount is harmless: handlers don't depend on React.
      if (!/already|duplicate|exists/i.test(msg)) {
        errors.push(`${tool.name}: ${msg}`)
        return { release: () => {}, failed: true }
      }
    }
    return {
      failed: false,
      release() {
        ac.abort()
        try { (handle as { unregister?: () => void } | undefined)?.unregister?.() } catch { /* ignore */ }
        try { mc!.unregisterTool?.(tool.name) } catch { /* ignore */ }
      },
    }
  }

  const staticAttached = staticTools.map((t) => ({ name: t.name, ...attach(t) }))
  const active = new Map<string, { signature: string; release: () => void }>()

  function publish() {
    const names = [...staticAttached.filter((s) => !s.failed).map((s) => s.name), ...active.keys()]
    const prev = dashboardStore.getState().webmcp
    if (prev.state === 'registered' && prev.tools.join() === names.join()) return
    dashboardStore.setWebMcp(
      names.length
        ? { state: 'registered', tools: names, detail: errors.join('; ') || undefined }
        : { state: 'error', tools: [], detail: errors.join('; ') },
    )
  }

  function sync() {
    const s = dashboardStore.getState()
    for (const spec of dynamicSpecs) {
      const signature = spec.signature(s)
      const cur = active.get(spec.name)
      if (cur && cur.signature === signature) continue
      if (cur) {
        cur.release()
        active.delete(spec.name)
      }
      if (signature !== null) {
        const r = attach(spec.build(signature))
        if (!r.failed) active.set(spec.name, { signature, release: r.release })
      }
    }
    publish()
  }

  sync()
  const unsubscribe = dashboardStore.subscribe(sync)

  return () => {
    unsubscribe()
    staticAttached.forEach((s) => s.release())
    active.forEach((a) => a.release())
    active.clear()
  }
}
