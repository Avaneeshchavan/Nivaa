'use client'

import { PDFViewer } from '@react-pdf/renderer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function PDFViewerWrapper({ children, className }: { children: React.ReactElement<any>, className?: string }) {
  return <PDFViewer className={className} showToolbar={false} innerRef={frame => { if (frame) frame.title = 'Prescription PDF preview' }}>{children}</PDFViewer>
}
