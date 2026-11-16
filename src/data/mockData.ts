export const CHANNELS = ['Organic', 'Paid Search', 'Email', 'Social', 'Referral'] as const
export const REGIONS = ['North America', 'EMEA', 'APAC', 'LATAM'] as const
export const MONTHS = [
  '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
] as const

export type Channel = (typeof CHANNELS)[number]
export type Region = (typeof REGIONS)[number]
export type Month = (typeof MONTHS)[number]

export interface Row {
  month: Month
  channel: Channel
  region: Region
  revenue: number
  orders: number
  users: number
}

// Small seeded PRNG so the demo data is identical on every load.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CHANNEL_BASE: Record<Channel, number> = {
  Organic: 1.0,
  'Paid Search': 1.3,
  Email: 0.6,
  Social: 0.8,
  Referral: 0.4,
}
// Per-channel monthly growth, so "which channel grew fastest" has a real answer.
const CHANNEL_GROWTH: Record<Channel, number> = {
  Organic: 0.015,
  'Paid Search': 0.006,
  Email: 0.03,
  Social: 0.045,
  Referral: 0.01,
}
const REGION_BASE: Record<Region, number> = {
  'North America': 1.0,
  EMEA: 0.75,
  APAC: 0.6,
  LATAM: 0.3,
}

function generate(): Row[] {
  const rand = mulberry32(42)
  const rows: Row[] = []
  MONTHS.forEach((month, mi) => {
    CHANNELS.forEach((channel) => {
      REGIONS.forEach((region) => {
        const growth = Math.pow(1 + CHANNEL_GROWTH[channel], mi)
        const seasonal = 1 + 0.12 * Math.sin((mi / 12) * Math.PI * 2) + (mi >= 10 ? 0.1 : 0)
        const noise = 0.9 + rand() * 0.2
        const scale = CHANNEL_BASE[channel] * REGION_BASE[region] * growth * seasonal * noise
        const orders = Math.round(420 * scale)
        const revenue = Math.round(orders * (58 + rand() * 14))
        const users = Math.round(orders * (3.2 + rand() * 0.8))
        rows.push({ month, channel, region, revenue, orders, users })
      })
    })
  })
  return rows
}

export const DATA: Row[] = generate()
