import { BONE_MAP } from '../../constants/bones'
import { UI } from '../../constants/uiText'
import { useAppStore } from '../../store'
import { BackgroundPanel } from '../panels/BackgroundPanel'
import { CameraPanel } from '../panels/CameraPanel'
import { CharacterPanel } from '../panels/CharacterPanel'
import { BoneInspector, PosePresetSection } from '../panels/PosePanel'
import { Icon } from '../ui/Icon'

/**
 * Right-hand panel whose content follows the selection: the scene settings
 * when nothing is selected, the bone's rotation when a bone is. The header
 * names what is being edited and leads back to the scene.
 */
export function Inspector() {
  const selectedBone = useAppStore((state) => state.selectedBone)
  const selectBone = useAppStore((state) => state.selectBone)

  return (
    <aside className="inspector" aria-label={UI.inspector.label}>
      <div className="inspector__header">
        {selectedBone ? (
          <>
            <button type="button" className="inspector__back" title={UI.inspector.back} onClick={() => selectBone(null)}>
              <Icon name="chevronLeft" size={14} />
              {UI.inspector.scene}
            </button>
            <span className="inspector__sep" aria-hidden>
              /
            </span>
            <h2 className="inspector__title">{BONE_MAP[selectedBone].label}</h2>
          </>
        ) : (
          <h2 className="inspector__title">{UI.inspector.scene}</h2>
        )}
      </div>
      <div className="inspector__body">
        {selectedBone ? (
          <BoneInspector bone={selectedBone} />
        ) : (
          <>
            <PosePresetSection />
            <CharacterPanel />
            <CameraPanel />
            <BackgroundPanel />
          </>
        )}
      </div>
    </aside>
  )
}
