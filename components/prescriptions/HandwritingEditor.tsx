'use client'

import { useRef, useState, type PointerEvent } from 'react'
import { emptyHandwriting, handwritingSchema, strokePath, type Handwriting } from '@/lib/validations/handwriting.schema'
import { uploadHandwritingPhoto } from '@/actions/handwriting.actions'
import { Button } from '@/components/ui/button'

async function preparePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15000000) throw new Error('Choose a JPG, PNG, or WebP photo under 15 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Photo preparation unavailable')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Photo preparation failed')), 'image/jpeg', 0.75))
    if (blob.size > 750000) throw new Error('Photo is too large. Crop it and try again.')
    return new File([blob], 'handwritten-note.jpg', { type: 'image/jpeg' })
  } finally { bitmap.close() }
}

export default function HandwritingEditor({ value, onChange, disabled = false, onBusyChange }: {
  value: Handwriting
  onChange: (value: Handwriting) => void
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const pointer = useRef<number | null>(null)
  const points = useRef<Handwriting['strokes'][number]>([])
  const [active, setActive] = useState<Handwriting['strokes'][number]>([])
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const [undo, setUndo] = useState<Handwriting[]>([])

  const commit = (next: Handwriting) => {
    const result = handwritingSchema.safeParse(next)
    if (!result.success) { setError('This note is full. Save before adding more handwriting.'); return }
    setUndo(previous => [...previous.slice(-9), value])
    setError('')
    onChange(result.data)
  }
  const point = (event: PointerEvent<SVGSVGElement>): [number, number] => {
    const rect = event.currentTarget.getBoundingClientRect()
    return [Math.round(Math.max(0, Math.min(1000, (event.clientX - rect.left) / rect.width * 1000))),
      Math.round(Math.max(0, Math.min(600, (event.clientY - rect.top) / rect.height * 600)))]
  }
  const start = (event: PointerEvent<SVGSVGElement>) => {
    if (disabled || uploading || pointer.current !== null || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current = event.pointerId
    points.current = [point(event)]
    setActive(points.current)
    onBusyChange?.(true)
  }
  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerId !== pointer.current || points.current.length >= 1500) return
    const next = point(event)
    const last = points.current[points.current.length - 1]
    if (Math.hypot(next[0] - last[0], next[1] - last[1]) < 2) return
    points.current = [...points.current, next]
    setActive(points.current)
  }
  const finish = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerId !== pointer.current) return
    pointer.current = null
    commit({ ...value, strokes: [...value.strokes, points.current] })
    points.current = []
    setActive([])
    onBusyChange?.(false)
  }
  const upload = async (file: File) => {
    setUploading(true)
    onBusyChange?.(true)
    setError('')
    try {
      const form = new FormData()
      form.set('photo', await preparePhoto(file))
      const photoId = await uploadHandwritingPhoto(form)
      commit({ ...value, photoId })
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Photo upload failed. Try again.') }
    finally { setUploading(false); onBusyChange?.(false) }
  }
  return <div className="space-y-3">
    <p className="text-sm text-muted-foreground">Write with a mouse, finger, or Pencil. You can also attach a photo of paper notes. Handwriting is included on an additional prescription page.</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={disabled || uploading || !undo.length} onClick={() => {
        onChange(undo[undo.length - 1]); setUndo(previous => previous.slice(0, -1)); setError('')
      }}>Undo</Button>
      <Button type="button" variant="outline" disabled={disabled || uploading || !value.strokes.length} onClick={() => commit({ ...value, strokes: [] })}>Clear drawing</Button>
      <Button type="button" variant="outline" disabled={disabled || uploading} onClick={() => input.current?.click()}>{uploading ? 'Uploading photo…' : 'Attach paper note'}</Button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Photo of handwritten note" disabled={disabled || uploading} onChange={event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (file) void upload(file)
      }} />
    </div>
    {/* Pointer capture keeps a stroke continuous and ignores other fingers while drawing. */}
    <svg viewBox="0 0 1000 600" preserveAspectRatio="none" role="img" aria-label="Handwritten notes drawing area"
      className={`w-full aspect-[5/3] rounded-xl border-2 border-input bg-white ${disabled || uploading ? 'pointer-events-none opacity-60' : 'cursor-crosshair'}`}
      style={{ touchAction: 'none' }} onPointerDown={start} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
      {[150, 300, 450].map(y => <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="#e2e8f0" />)}
      {[...value.strokes, ...(active.length ? [active] : [])].map((stroke, index) => <path key={index} d={strokePath(stroke)} fill="none" stroke="#172a35" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
    {value.photoId && <div className="space-y-2 rounded-xl border p-3">
      {/* Authenticated route keeps patient images private. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/handwriting/${value.photoId}`} alt="Attached handwritten paper note" className="max-h-80 w-full object-contain" />
      <Button type="button" variant="outline" disabled={disabled || uploading} onClick={() => commit({ ...value, photoId: emptyHandwriting.photoId })}>Remove photo</Button>
    </div>}
    {error && <p role="alert" className="text-red-900">{error}</p>}
  </div>
}
