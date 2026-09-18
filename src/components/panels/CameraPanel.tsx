import {
  CAMERA_DISTANCE_RANGE,
  CAMERA_POSITION_RANGE,
  CAMERA_PRESETS,
  CAMERA_PRESET_MAP,
  CAMERA_TARGET_RANGE,
  DEFAULT_FOV,
  FOV_RANGE,
} from '../../constants/cameraPresets'
import { useAppStore } from '../../store'
import { orbitFromPositionTarget, round } from '../../utils/math'
import { Button } from '../ui/Button'
import { Section } from '../ui/Section'
import { SliderField } from '../ui/SliderField'
import { VectorFields } from '../ui/VectorFields'

const DEGREE = '\u00B0'

export function CameraPanel() {
  const camera = useAppStore((state) => state.camera)
  const activePreset = useAppStore((state) => state.activeCameraPreset)
  const setFov = useAppStore((state) => state.setFov)
  const setCameraOrbit = useAppStore((state) => state.setCameraOrbit)
  const setCameraPosition = useAppStore((state) => state.setCameraPosition)
  const setCameraTarget = useAppStore((state) => state.setCameraTarget)
  const applyCameraPreset = useAppStore((state) => state.applyCameraPreset)
  const resetCamera = useAppStore((state) => state.resetCamera)

  const orbit = orbitFromPositionTarget(camera.position, camera.target)
  const subtitle = activePreset === 'custom' ? 'Custom' : CAMERA_PRESET_MAP[activePreset].label

  return (
    <Section
      title="Camera"
      subtitle={subtitle}
      actions={
        <Button size="sm" variant="ghost" onClick={resetCamera}>
          Reset
        </Button>
      }
    >
      <div className="control-group">
        <div className="control-group__label">Preset</div>
        <div className="preset-grid preset-grid--4">
          {CAMERA_PRESETS.map((preset) => (
            <Button key={preset.id} size="sm" active={activePreset === preset.id} onClick={() => applyCameraPreset(preset.id)} title={preset.label}>
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
      <SliderField label="FOV" value={camera.fov} min={FOV_RANGE.min} max={FOV_RANGE.max} step={1} decimals={0} unit={DEGREE} onChange={setFov} onReset={() => setFov(DEFAULT_FOV)} />
      <div className="control-group">
        <div className="control-group__label">Orbit</div>
        <SliderField label="Yaw" value={round(orbit.yaw, 1)} min={-180} max={180} step={1} decimals={1} unit={DEGREE} onChange={(yaw) => setCameraOrbit({ yaw })} />
        <SliderField label="Pitch" value={round(orbit.pitch, 1)} min={-89} max={89} step={1} decimals={1} unit={DEGREE} onChange={(pitch) => setCameraOrbit({ pitch })} />
        <SliderField label="Distance" value={round(orbit.distance, 2)} min={CAMERA_DISTANCE_RANGE.min} max={CAMERA_DISTANCE_RANGE.max} step={0.05} decimals={2} unit="m" onChange={(distance) => setCameraOrbit({ distance })} />
      </div>
      <details className="disclosure">
        <summary>Position / Look At (numeric)</summary>
        <div className="disclosure__body">
          <VectorFields label="Position" value={camera.position} min={CAMERA_POSITION_RANGE.min} max={CAMERA_POSITION_RANGE.max} onChange={setCameraPosition} />
          <VectorFields label="Look At" value={camera.target} min={CAMERA_TARGET_RANGE.min} max={CAMERA_TARGET_RANGE.max} onChange={setCameraTarget} />
        </div>
      </details>
    </Section>
  )
}
