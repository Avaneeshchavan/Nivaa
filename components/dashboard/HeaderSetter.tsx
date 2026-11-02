'use client'

import { useEffect } from 'react'
import { useHeader } from './HeaderContext'

export default function HeaderSetter({ title }: { title: string }) {
  const { setTitle } = useHeader()

  useEffect(() => {
    setTitle(title)
  }, [title, setTitle])

  return null
}
