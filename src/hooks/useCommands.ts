import { useMemo } from 'react'
import { ASPECT_RATIOS } from '../constants/aspectRatios'
import { BACKGROUNDS } from '../constants/backgrounds'
import { BONES } from '../constants/bones'
import { CAMERA_PRESETS } from '../constants/cameraPresets'
import { POSE_PRESETS } from '../constants/posePresets'
import { UI } from '../constants/uiText'
import { canUseAgentBridge } from '../agent/bridgeClient'
import { useAppStore } from '../store'
import { copyText } from '../utils/clipboard'
import { useExport } from './useExport'
import { usePromptText } from './usePromptText'

export interface Command {
  id: string
  /** Shown at the right of the row, e.g. "ポーズ". */
  group: string
  label: string
  /** Extra words that should find the command (English names, ids). */
  keywords?: string
  shortcut?: string
  run: () => void
}

/** Everything the command palette can do; each entry calls the same store action as its button. */
export function useCommands(): Command[] {
  const { downloadPng, copyPng, canCopyImage } = useExport()
  const prompt = usePromptText()
  const agentEnabled = useAppStore((state) => state.agentEnabled)
  const C = UI.commands

  return useMemo(() => {
    const store = () => useAppStore.getState()
    const commands: Command[] = [
      { id: 'undo', group: C.edit, label: C.undo, shortcut: 'Ctrl+Z', run: () => store().undo() },
      { id: 'redo', group: C.edit, label: C.redo, shortcut: 'Ctrl+Shift+Z', run: () => store().redo() },
      { id: 'mirror', group: C.edit, label: C.mirror, keywords: 'mirror flip', run: () => store().mirrorPose() },
      { id: 'resetAll', group: C.edit, label: C.resetAll, keywords: 'reset', run: () => store().resetAll() },
      { id: 'modeCamera', group: C.mode, label: C.modeCamera, keywords: 'camera', shortcut: 'C', run: () => store().setInteractionMode('camera') },
      { id: 'modePose', group: C.mode, label: C.modePose, keywords: 'pose', shortcut: 'P', run: () => store().setInteractionMode('pose') },
      ...POSE_PRESETS.map((preset) => ({
        id: `pose-${preset.id}`,
        group: C.pose,
        label: preset.label,
        keywords: `${preset.labelEn} ${preset.id}`,
        run: () => store().applyPosePreset(preset.id),
      })),
      ...BONES.map((bone) => ({
        id: `bone-${bone.id}`,
        group: C.bone,
        label: C.selectBone(bone.label),
        keywords: bone.id,
        run: () => store().selectBone(bone.id),
      })),
      ...CAMERA_PRESETS.map((preset) => ({
        id: `camera-${preset.id}`,
        group: C.camera,
        label: preset.label,
        keywords: preset.id,
        run: () => store().applyCameraPreset(preset.id),
      })),
      ...ASPECT_RATIOS.map((option) => ({
        id: `aspect-${option.id}`,
        group: C.aspect,
        label: option.label,
        keywords: `${option.width}x${option.height}`,
        run: () => store().setAspectRatio(option.id),
      })),
      ...BACKGROUNDS.map((option) => ({
        id: `background-${option.id}`,
        group: C.background,
        label: option.label,
        keywords: option.id,
        run: () => store().setBackground(option.id),
      })),
      { id: 'grid', group: C.view, label: C.toggleGrid, keywords: 'grid', run: () => store().setShowGrid(!store().showGrid) },
      { id: 'shadow', group: C.view, label: C.toggleShadow, keywords: 'shadow', run: () => store().setShowShadow(!store().showShadow) },
      { id: 'hideUi', group: C.view, label: C.hideUi, keywords: 'focus hide ui', shortcut: 'Ctrl+\\', run: () => store().setUiHidden(!store().uiHidden) },
      { id: 'savePng', group: C.export, label: UI.export.exportPng, keywords: 'png save export', shortcut: 'Ctrl+S', run: () => void downloadPng() },
      { id: 'copyPrompt', group: C.export, label: C.copyPrompt, keywords: 'prompt copy', run: () => {
        void copyText(prompt).then(
          () => store().showNotice(UI.prompt.copied, 'success'),
          () => store().showNotice(UI.prompt.copyFailed, 'error'),
        )
      } },
    ]
    if (canUseAgentBridge()) {
      commands.push({
        id: 'agent',
        group: C.agent,
        label: agentEnabled ? C.agentOff : C.agentOn,
        keywords: 'ai agent mcp claude codex',
        run: () => store().setAgentEnabled(!store().agentEnabled),
      })
    }
    if (canCopyImage) {
      commands.push({ id: 'copyPng', group: C.export, label: UI.export.copyImage, keywords: 'copy image clipboard', run: () => void copyPng() })
    }
    return commands
  }, [C, downloadPng, copyPng, canCopyImage, prompt, agentEnabled])
}

/** Commands whose group, label or keywords contain every space-separated word of the query. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return commands
  return commands.filter((command) => {
    const haystack = `${command.group} ${command.label} ${command.keywords ?? ''}`.toLowerCase()
    return words.every((word) => haystack.includes(word))
  })
}
