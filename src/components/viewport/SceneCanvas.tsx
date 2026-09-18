import { Canvas } from '@react-three/fiber'
import { useAppStore } from '../../store'
import { CameraRig } from './CameraRig'
import { DevBridge } from './DevBridge'
import { ExportBridge } from './ExportBridge'
import { Ground } from './Ground'
import { Lights } from './Lights'
import { Mannequin } from './Mannequin'
import { SceneBackground } from './SceneBackground'

export function SceneCanvas() {
  const selectBone = useAppStore((state) => state.selectBone)
  // Initial camera setup; afterwards CameraRig keeps the camera in sync with the store.
  const initial = useAppStore.getState().camera

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{
        fov: initial.fov,
        near: 0.05,
        far: 100,
        position: [initial.position.x, initial.position.y, initial.position.z],
      }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => selectBone(null)}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneBackground />
      <CameraRig />
      <Lights />
      <Ground />
      <Mannequin />
      <ExportBridge />
      {import.meta.env.DEV ? <DevBridge /> : null}
    </Canvas>
  )
}
