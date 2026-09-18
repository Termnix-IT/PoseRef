import { useCallback, useEffect, useRef, useState } from 'react'
import { getExportSize } from '../constants/aspectRatios'
import { UI } from '../constants/uiText'
import { useAppStore } from '../store'
import { canCopyImages, copyImageBlob } from '../utils/clipboard'
import { buildExportFilename, downloadBlob } from '../utils/download'

export type ExportAction = 'download' | 'copy'

export type ExportStatus =
  | { kind: 'idle' }
  | { kind: 'busy'; action: ExportAction }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

/** Drives PNG export (download / copy) using the renderer registered by the 3D view. */
export function useExport(resetAfterMs = 3000) {
  const [status, setStatus] = useState<ExportStatus>({ kind: 'idle' })
  const timer = useRef<number | null>(null)
  const setExporting = useAppStore((state) => state.setExporting)

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const flash = useCallback(
    (next: ExportStatus) => {
      setStatus(next)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setStatus({ kind: 'idle' }), resetAfterMs)
    },
    [resetAfterMs],
  )

  const renderCurrentView = useCallback(async (): Promise<Blob> => {
    const { exportRenderer, aspectRatio, exportScale } = useAppStore.getState()
    if (!exportRenderer) throw new Error(UI.export.notReady)
    const { width, height } = getExportSize(aspectRatio, exportScale)
    return exportRenderer({ width, height })
  }, [])

  const run = useCallback(
    async (action: ExportAction, consume: (blob: Blob) => Promise<void>, successMessage: string) => {
      setExporting(true)
      setStatus({ kind: 'busy', action })
      try {
        const blob = await renderCurrentView()
        await consume(blob)
        flash({ kind: 'success', message: successMessage })
      } catch (error) {
        const message = error instanceof Error ? error.message : UI.export.failed
        flash({ kind: 'error', message })
      } finally {
        setExporting(false)
      }
    },
    [flash, renderCurrentView, setExporting],
  )

  const downloadPng = useCallback(() => {
    return run(
      'download',
      async (blob) => {
        const { aspectRatio, pose, activeCameraPreset } = useAppStore.getState()
        downloadBlob(blob, buildExportFilename([pose.presetId, activeCameraPreset, aspectRatio]))
      },
      UI.export.saved,
    )
  }, [run])

  const copyPng = useCallback(() => {
    return run('copy', copyImageBlob, UI.export.copied)
  }, [run])

  return { status, downloadPng, copyPng, canCopyImage: canCopyImages() }
}
