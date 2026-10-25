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

export function PosePanel() {
  const presetId = useAppStore((state) => state.pose.presetId)
  const applyPosePreset = useAppStore((state) => state.applyPosePreset)
  const resetPose = useAppStore((state) => state.resetPose)
  const selectedBone = useAppStore((state) => state.selectedBone)
  const selectBone = useAppStore((state) => state.selectBone)
  const subtitle = presetId === 'custom' ? UI.common.custom : POSE_PRESET_MAP[presetId].label

  return (
    <Section
      title={UI.pose.title}
      subtitle={subtitle}
      actions={
        <Button size="sm" variant="ghost" onClick={resetPose}>
          {UI.common.reset}
        </Button>
      }
    >
      {/* Groups (standing, gestures, actions, seated) are told apart by spacing alone. */}
      <div className="preset-groups" role="group" aria-label={UI.pose.presets}>
        {POSE_GROUPS.map((group) => (
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
      <div className="divider" />
      <BonePicker selected={selectedBone} onSelect={selectBone} />
      <BoneRotationEditor bone={selectedBone} />
    </Section>
  )
}

/**
 * X / Y / Z sliders for the bone highlighted in the picker above; shown
 * disabled until a bone is picked, so the layout says what to do first.
 */
function BoneRotationEditor({ bone }: { bone: BoneId | null }) {
  const rotation = useAppStore((state) => (bone ? state.pose.bones[bone] : null))
  const setBoneRotation = useAppStore((state) => state.setBoneRotation)
  const resetBone = useAppStore((state) => state.resetBone)
  const label = bone ? UI.pose.rotationOf(BONE_MAP[bone].label) : undefined

  return (
    <div className="control-group" role="group" aria-label={label}>
      {AXES.map((axis) => (
        <SliderField
          key={axis}
          label={axis.toUpperCase()}
          value={rotation ? rotation[axis] : 0}
          min={-180}
          max={180}
          step={1}
          decimals={0}
          unit={DEGREE}
          disabled={!bone}
          onChange={(value) => bone && setBoneRotation(bone, axis, value)}
          onReset={() => bone && setBoneRotation(bone, axis, 0)}
        />
      ))}
      <div className="control-group__actions">
        <Button size="sm" variant="ghost" disabled={!bone} title={label && UI.common.resetOf(label)} onClick={() => bone && resetBone(bone)}>
          {UI.pose.resetBone}
        </Button>
      </div>
    </div>
  )
}
