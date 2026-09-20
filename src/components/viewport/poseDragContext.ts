import { createContext, useContext } from 'react'
import type { PoseDragHandlers } from '../../hooks/usePoseDrag'

/**
 * Shares one drag controller with every draggable mesh inside the mannequin,
 * so the listeners and drag state exist once rather than per body part.
 */
export const PoseDragContext = createContext<PoseDragHandlers | null>(null)

export function usePoseDragContext(): PoseDragHandlers | null {
  return useContext(PoseDragContext)
}
