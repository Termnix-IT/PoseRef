import type { StateCreator } from 'zustand'
import { DEFAULT_MANNEQUIN_COLOR } from '../../constants/bones'
import type { Axis, CharacterState } from '../../types'
import type { AppStore } from '../index'

export interface CharacterSlice {
  character: CharacterState
  setCharacterPosition: (axis: Axis, value: number) => void
  setCharacterYaw: (yaw: number) => void
  setCharacterColor: (color: string) => void
  /** Resets position and rotation (color is kept). */
  resetCharacter: () => void
}

export function createDefaultCharacter(): CharacterState {
  return { position: { x: 0, y: 0, z: 0 }, yaw: 0, color: DEFAULT_MANNEQUIN_COLOR }
}

export const createCharacterSlice: StateCreator<AppStore, [], [], CharacterSlice> = (set) => ({
  character: createDefaultCharacter(),
  setCharacterPosition: (axis, value) =>
    set((state) => ({
      character: { ...state.character, position: { ...state.character.position, [axis]: value } },
    })),
  setCharacterYaw: (yaw) => set((state) => ({ character: { ...state.character, yaw } })),
  setCharacterColor: (color) => set((state) => ({ character: { ...state.character, color } })),
  resetCharacter: () =>
    set((state) => ({ character: { ...createDefaultCharacter(), color: state.character.color } })),
})
