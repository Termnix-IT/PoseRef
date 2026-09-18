import type { AspectRatioId, AspectRatioOption, ExportScale } from '../types'

/** Supported aspect ratios with their 1024px-basis export sizes. */
export const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: '1:1', label: '1:1', width: 1024, height: 1024 },
  { id: '16:9', label: '16:9', width: 1024, height: 576 },
  { id: '9:16', label: '9:16', width: 576, height: 1024 },
  { id: '4:3', label: '4:3', width: 1024, height: 768 },
  { id: '3:4', label: '3:4', width: 768, height: 1024 },
]

export const ASPECT_RATIO_MAP: Record<AspectRatioId, AspectRatioOption> = Object.fromEntries(
  ASPECT_RATIOS.map((option) => [option.id, option]),
) as Record<AspectRatioId, AspectRatioOption>

export const DEFAULT_ASPECT_RATIO: AspectRatioId = '1:1'

export function getAspectValue(id: AspectRatioId): number {
  const option = ASPECT_RATIO_MAP[id]
  return option.width / option.height
}

export function getExportSize(id: AspectRatioId, scale: ExportScale): { width: number; height: number } {
  const option = ASPECT_RATIO_MAP[id]
  return { width: option.width * scale, height: option.height * scale }
}
