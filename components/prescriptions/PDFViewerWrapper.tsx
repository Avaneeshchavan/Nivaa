'use client'

import { PDFViewer } from '@react-pdf/renderer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PDFViewerWrapper({ children, className }: { children: React.ReactElement<any>, className?: string }) {
  return <PDFViewer className={className}>{children}</PDFViewer>
}
