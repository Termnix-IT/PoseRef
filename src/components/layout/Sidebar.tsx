import { BackgroundPanel } from '../panels/BackgroundPanel'
import { CameraPanel } from '../panels/CameraPanel'
import { CharacterPanel } from '../panels/CharacterPanel'
import { ExportPanel } from '../panels/ExportPanel'
import { PosePanel } from '../panels/PosePanel'

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Controls">
      <PosePanel />
      <CharacterPanel />
      <CameraPanel />
      <BackgroundPanel />
      <ExportPanel />
    </aside>
  )
}
