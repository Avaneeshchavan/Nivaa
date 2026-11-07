import { z } from 'zod'

export const handwritingSchema = z.object({
  strokes: z.array(z.array(z.tuple([
    z.number().finite().min(0).max(1000),
    z.number().finite().min(0).max(600),
  ])).min(1).max(1500)).max(200),
  photoId: z.uuid().nullable(),
}).refine(value => value.strokes.reduce((count, stroke) => count + stroke.length, 0) <= 15000, {
  message: 'This note is full. Save it before adding more handwriting.',
})
export type Handwriting = z.infer<typeof handwritingSchema>
export const emptyHandwriting: Handwriting = { strokes: [], photoId: null }
export function parseHandwriting(value: unknown): Handwriting {
  return handwritingSchema.parse(value ?? emptyHandwriting)
}
export function strokePath(stroke: Handwriting['strokes'][number]) {
  const points = stroke.length === 1 ? [...stroke, [stroke[0][0] + 0.01, stroke[0][1]]] : stroke
  return points.map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`).join(' ')
}
