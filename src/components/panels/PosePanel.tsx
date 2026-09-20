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

const DEGREE = '\u00B0'

export function PosePanel() {
  const presetId = useAppStore((state) => state.pose.presetId)
  const applyPosePreset = useAppStore((state) => state.applyPosePreset)
  const resetPose = useAppStore((state) => state.resetPose)
  const selectedBone = useAppStore((state) => state.selectedBone)
  const selectBone = useAppStore((state) => state.selectBone)
  const poseMode = useAppStore((state) => state.interactionMode === 'pose')
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
      <div className="control-group">
        <div className="control-group__label">{UI.pose.preset}</div>
        {POSE_GROUPS.map((group) => (
          <div key={group.id} className="preset-group">
            <div className="preset-group__label">{group.label}</div>
            <div className="preset-grid preset-grid--3">
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
          </div>
        ))}
      </div>
      <div className="control-group">
        <div className="control-group__label">{UI.pose.bone}</div>
        <BonePicker selected={selectedBone} onSelect={selectBone} />
        {poseMode ? <p className="hint">{UI.mode.hint}</p> : null}
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
    return <p className="hint">{UI.pose.selectHint}</p>
  }

  return (
    <div className="control-group">
      <div className="control-group__label">
        <span>{UI.pose.rotationOf(BONE_MAP[bone].label)}</span>
        <Button size="sm" variant="ghost" onClick={() => resetBone(bone)}>
          {UI.common.reset}
        </Button>
      </div>
      {AXES.map((axis) => (
        <SliderField
          key={axis}
          label={UI.pose.axisRotation(axis.toUpperCase())}
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
