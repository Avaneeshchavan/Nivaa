export default function DashboardLoading() {
  return <div role="status" aria-live="polite" className="space-y-5">
    <p className="font-medium text-muted-foreground">Loading clinic workspace…</p>
    <div aria-hidden="true" className="h-28 animate-pulse rounded-2xl bg-secondary" />
    <div aria-hidden="true" className="h-64 animate-pulse rounded-2xl bg-muted" />
  </div>
}
