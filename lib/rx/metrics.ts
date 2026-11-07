// Development-only, numeric timings. Never record patient, diagnosis, medicine or doctor identifiers.
type Metric = { name: string; milliseconds: number }
declare global { interface Window { __NIVAA_RX_METRICS__?: Metric[] } }
let firstSearch: number | null = null, added = 0
export function rxMetric(name: string, milliseconds: number) {
  if (process.env.NODE_ENV !== 'development' || typeof window === 'undefined') return
  const rows = window.__NIVAA_RX_METRICS__ ||= []
  rows.push({ name, milliseconds: Math.round(milliseconds * 1000) / 1000 })
  if (rows.length > 200) rows.splice(0, rows.length - 200)
}
export function startRxSearch() {
  if (process.env.NODE_ENV === 'development' && firstSearch === null) firstSearch = performance.now()
}
export function addedRxMedicine() {
  if (process.env.NODE_ENV !== 'development') return
  added += 1
  if (added === 4 && firstSearch !== null) rxMetric('four-medicines-first-search-to-fourth-add', performance.now() - firstSearch)
}
export function resetRxMetrics() { firstSearch = null; added = 0 }
