'use client'
import { useEffect, useRef, useState } from 'react'
import { saveRxDraft, deleteRxDraft } from '@/actions/drafts.actions'
import { useRxBuilderStore } from '@/stores/rxBuilderStore'
import { rxDraftSchema, type RxDraft } from '@/lib/validations/draft.schema'

export function useRxAutosave(key: string) {
  const [status, setStatus] = useState('')
  const stopped = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const pending = useRef<RxDraft | null>(null)
  useEffect(() => {
    stopped.current = false
    const save = () => {
      const payload = pending.current
      pending.current = null
      if (!payload || stopped.current) return
      queue.current = queue.current.then(async () => {
        try { await saveRxDraft(key, payload); if (!stopped.current) setStatus('Draft saved') }
        catch { if (!stopped.current) setStatus('Draft could not be saved. Keep this page open and try again.') }
      })
    }
    const unsubscribe = useRxBuilderStore.subscribe(state => {
      if (stopped.current) return
      const parsed = rxDraftSchema.safeParse(state)
      clearTimeout(timer.current)
      if (!parsed.success) { setStatus('Draft exceeds save limits'); return }
      pending.current = parsed.data
      setStatus('Saving draft…')
      timer.current = setTimeout(save, 800)
    })
    return () => { unsubscribe(); clearTimeout(timer.current); save(); useRxBuilderStore.getState().reset() }
  }, [key])
  const complete = async () => {
    stopped.current = true
    clearTimeout(timer.current)
    pending.current = null
    await queue.current
    await deleteRxDraft(key)
  }
  return { status, complete }
}
