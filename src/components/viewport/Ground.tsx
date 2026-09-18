import { Grid } from '@react-three/drei'
import { BACKGROUND_MAP } from '../../constants/backgrounds'
import { useAppStore } from '../../store'

/** Floor grid and a shadow-only ground plane. Both can be toggled from the Background panel. */
export function Ground() {
  const showGrid = useAppStore((state) => state.showGrid)
  const showShadow = useAppStore((state) => state.showShadow)
  const background = useAppStore((state) => state.background)
  const option = BACKGROUND_MAP[background]

  return (
    <>
      {showGrid ? (
        <Grid
          position={[0, 0.002, 0]}
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.7}
          cellColor={option.gridCellColor}
          sectionSize={2}
          sectionThickness={1.1}
          sectionColor={option.gridSectionColor}
          fadeDistance={16}
          fadeStrength={1.3}
          infiniteGrid
        />
      ) : null}
      {showShadow ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <shadowMaterial transparent opacity={0.3} />
        </mesh>
      ) : null}
    </>
  )
}
