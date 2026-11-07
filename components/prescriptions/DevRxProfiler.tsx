'use client'
import { Profiler, useEffect, type ReactNode } from 'react'
import { resetRxMetrics, rxMetric } from '@/lib/rx/metrics'
export default function DevRxProfiler({ children }: { children: ReactNode }) {
  useEffect(() => { resetRxMetrics() }, [])
  if (process.env.NODE_ENV !== 'development') return children
  return <Profiler id="rx-builder" onRender={(_id, _phase, duration) => rxMetric('react-commit', duration)}>
    <div onInputCapture={() => { const started = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => rxMetric('input-to-next-paint-approx', performance.now() - started))) }}>{children}</div>
  </Profiler>
}
