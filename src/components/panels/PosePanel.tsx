import { useState } from 'react'
import { BONE_MAP } from '../../constants/bones'
import { POSE_GROUPS, POSE_PRESET_MAP, posePresetsByGroup } from '../../constants/posePresets'
import { UI } from '../../constants/uiText'
import { useAppStore } from '../../store'
import type { BoneId } from '../../types'
import { AXES } from '../../utils/math'
import { Button } from '../ui/Button'
import { Section } from '../ui/Section'
import { SliderField } from '../ui/SliderField'
import { BonePicker } from './BonePicker'

const DEGREE = '°'

/**
 * Pose presets for the scene inspector. Collapsed, it shows the group of the
 * current preset (standing, gestures, actions, seated); "all" lists every group.
 */
export function PosePresetSection() {
  const [expanded, setExpanded] = useState(false)
  const presetId = useAppStore((state) => state.pose.presetId)
  const applyPosePreset = useAppStore((state) => state.applyPosePreset)
  const resetPose = useAppStore((state) => state.resetPose)
  const current = presetId === 'custom' ? null : POSE_PRESET_MAP[presetId]
  const groups = expanded ? POSE_GROUPS : POSE_GROUPS.filter((group) => group.id === (current?.group ?? POSE_GROUPS[0].id))

  return (
    <Section
      title={UI.pose.title}
      subtitle={current ? current.label : UI.common.custom}
      actions={
        <>
          <Button size="sm" variant="ghost" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? UI.pose.showLess : UI.pose.showAll}
          </Button>
          <Button size="sm" variant="ghost" onClick={resetPose}>
            {UI.common.reset}
          </Button>
        </>
      }
    >
      <div className="preset-groups" role="group" aria-label={UI.pose.presets}>
        {groups.map((group) => (
          <div key={group.id} className="preset-grid preset-grid--3" role="group" aria-label={group.label}>
            {posePresetsByGroup(group.id).map((preset) => (
              <Button
                key={preset.id}
                size="sm"
                active={presetId === preset.id}
                title={`${preset.label} / ${preset.labelEn}`}
                onClick={() => applyPosePreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        ))}
      </div>
    </Section>
  )
}

/** Inspector content while a bone is selected: its rotation, then the picker to move to another bone. */
export function BoneInspector({ bone }: { bone: BoneId }) {
  const rotation = useAppStore((state) => state.pose.bones[bone])
  const setBoneRotation = useAppStore((state) => state.setBoneRotation)
  const resetBone = useAppStore((state) => state.resetBone)
  const selectBone = useAppStore((state) => state.selectBone)
  const label = BONE_MAP[bone].label

  return (
    <>
      <Section
        title={UI.inspector.rotation}
        actions={
          <Button size="sm" variant="ghost" title={UI.common.resetOf(UI.pose.rotationOf(label))} onClick={() => resetBone(bone)}>
            {UI.common.reset}
          </Button>
        }
      >
        <div className="control-group" role="group" aria-label={UI.pose.rotationOf(label)}>
          {AXES.map((axis) => (
            <SliderField
              key={axis}
              label={axis.toUpperCase()}
              value={rotation[axis]}
              min={-180}
              max={180}
              step={1}
              decimals={0}
              unit={DEGREE}
              onChange={(value) => setBoneRotation(bone, axis, value)}
              onReset={() => setBoneRotation(bone, axis, 0)}
            />
          ))}
        </div>
      </Section>
      <Section title={UI.pose.bones}>
        <BonePicker selected={bone} onSelect={selectBone} />
      </Section>
    </>
  )
}
