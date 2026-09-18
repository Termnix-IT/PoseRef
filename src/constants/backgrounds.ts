import type { BackgroundId, BackgroundOption } from '../types'

export const BACKGROUNDS: BackgroundOption[] = [
  {
    id: 'white',
    label: '白',
    color: '#ffffff',
    gridCellColor: '#d4d4d4',
    gridSectionColor: '#adadad',
    previewColor: '#ffffff',
  },
  {
    id: 'gray',
    label: 'グレー',
    color: '#7d7d7d',
    gridCellColor: '#8f8f8f',
    gridSectionColor: '#a9a9a9',
    previewColor: '#7d7d7d',
  },
  {
    id: 'black',
    label: '黒',
    color: '#000000',
    gridCellColor: '#2c2c2c',
    gridSectionColor: '#4a4a4a',
    previewColor: '#000000',
  },
  {
    id: 'transparent',
    label: '透過',
    color: null,
    gridCellColor: '#8a8a8a',
    gridSectionColor: '#a4a4a4',
    previewColor: 'transparent',
  },
]

export const BACKGROUND_MAP: Record<BackgroundId, BackgroundOption> = Object.fromEntries(
  BACKGROUNDS.map((option) => [option.id, option]),
) as Record<BackgroundId, BackgroundOption>

export const DEFAULT_BACKGROUND: BackgroundId = 'gray'
