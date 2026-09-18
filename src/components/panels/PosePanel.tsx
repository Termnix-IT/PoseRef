import { BONE_MAP } from '../../constants/bones'
import { POSE_PRESETS, POSE_PRESET_MAP } from '../../constants/posePresets'
import { useAppStore } from '../../store'
import type { BoneId } from '../../types'
import { AXES } from '../../utils/math'
import { Button } from '../ui/Button'
import { Section } from '../ui/Section'
import { SliderField } from '../ui/SliderField'
import { BonePicker } from './BonePicker'

const DEGREE = '\u00B0'

export function PosePanel() {
  const presetId = useAppStore((state) => state.pose.presetId)
  const applyPosePreset = useAppStore((state) => state.applyPosePreset)
  const resetPose = useAppStore((state) => state.resetPose)
  const selectedBone = useAppStore((state) => state.selectedBone)
  const selectBone = useAppStore((state) => state.selectBone)
  const subtitle = presetId === 'custom' ? 'Custom' : POSE_PRESET_MAP[presetId].label

  return (
    <Section
      title="Pose"
      subtitle={subtitle}
      actions={
        <Button size="sm" variant="ghost" onClick={resetPose}>
          Reset
        </Button>
      }
    >
      <div className="control-group">
        <div className="control-group__label">Preset</div>
        <div className="preset-grid preset-grid--2">
          {POSE_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              size="sm"
              active={presetId === preset.id}
              onClick={() => applyPosePreset(preset.id)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="control-group">
        <div className="control-group__label">Bone</div>
        <BonePicker selected={selectedBone} onSelect={selectBone} />
      </div>
      <BoneRotationEditor bone={selectedBone} />
    </Section>
  )
}

function BoneRotationEditor({ bone }: { bone: BoneId | null }) {
  const rotation = useAppStore((state) => (bone ? state.pose.bones[bone] : null))
  const setBoneRotation = useAppStore((state) => state.setBoneRotation)
  const resetBone = useAppStore((state) => state.resetBone)

  if (!bone || !rotation) {
    return <p className="hint">Select a bone above, or click a body part in the 3D view, to edit its rotation.</p>
  }

  return (
    <div className="control-group">
      <div className="control-group__label">
        <span>{BONE_MAP[bone].label} Rotation</span>
        <Button size="sm" variant="ghost" onClick={() => resetBone(bone)}>
          Reset
        </Button>
      </div>
      {AXES.map((axis) => (
        <SliderField
          key={axis}
          label={`${axis.toUpperCase()} Rotation`}
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
  )
}
