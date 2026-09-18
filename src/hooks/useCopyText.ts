import { useCallback, useEffect, useRef, useState } from 'react'
import { copyText } from '../utils/clipboard'

export type CopyStatus = 'idle' | 'copied' | 'error'

/** Copies text to the clipboard and exposes a short-lived status for UI feedback. */
export function useCopyText(resetAfterMs = 2000) {
  const [status, setStatus] = useState<CopyStatus>('idle')
  const timer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const copy = useCallback(
    async (text: string) => {
      try {
        await copyText(text)
        setStatus('copied')
      } catch {
        setStatus('error')
      }
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setStatus('idle'), resetAfterMs)
    },
    [resetAfterMs],
  )

  return { status, copy }
}
