import { CHANNELS, REGIONS } from '../data/mockData'
import { DIMENSIONS, METRICS, QUARTERS } from '../data/queries'

// JSON Schemas for tool inputs. Enums keep the model from inventing values.
const metric = { type: 'string', enum: [...METRICS], description: 'revenue is USD; orders and users are counts.' }
const groupBy = { type: 'string', enum: [...DIMENSIONS], description: 'Dimension to group results by.' }
const quarter = { type: 'string', enum: [...QUARTERS], description: "Calendar quarter of 2025, or 'all' for the full year." }
const channel = { type: 'string', enum: ['All', ...CHANNELS], description: "Marketing channel, or 'All'." }
const region = { type: 'string', enum: ['All', ...REGIONS], description: "Sales region, or 'All'." }
const chartType = { type: 'string', enum: ['bar', 'line', 'pie'], description: 'Chart style. Use line for months, pie for shares.' }
const comparableQuarter = { type: 'string', enum: ['Q1', 'Q2', 'Q3', 'Q4'] }

export const schemas = {
  list_metrics: { type: 'object', properties: {}, additionalProperties: false },
  query_metrics: {
    type: 'object',
    properties: { metric, groupBy, quarter, channel, region },
    required: ['metric', 'groupBy'],
    additionalProperties: false,
  },
  compare_periods: {
    type: 'object',
    properties: {
      metric,
      groupBy: { type: 'string', enum: ['channel', 'region'], description: 'Dimension to compare across.' },
      periodA: { ...comparableQuarter, description: 'Baseline quarter.' },
      periodB: { ...comparableQuarter, description: 'Quarter to compare against the baseline.' },
      channel,
      region,
    },
    required: ['metric', 'groupBy', 'periodA', 'periodB'],
    additionalProperties: false,
  },
  render_chart: {
    type: 'object',
    properties: {
      metric,
      groupBy,
      chartType,
      quarter,
      compareTo: {
        ...comparableQuarter,
        description:
          "Optional. A second quarter to show next to `quarter` in one grouped bar chart (e.g. quarter 'Q1' + compareTo 'Q4'). Needs a specific `quarter` and groupBy channel or region.",
      },
      channel,
      region,
    },
    required: ['metric', 'groupBy'],
    additionalProperties: false,
  },
  add_insight: {
    type: 'object',
    properties: {
      text: { type: 'string', maxLength: 300, description: 'One or two sentences with the key number(s), e.g. "Social grew fastest: +35% revenue from Q1 to Q4."' },
    },
    required: ['text'],
    additionalProperties: false,
  },
  set_filters: {
    type: 'object',
    properties: { quarter, channel, region },
    additionalProperties: false,
  },
  export_report: { type: 'object', properties: {}, additionalProperties: false },
} as const
