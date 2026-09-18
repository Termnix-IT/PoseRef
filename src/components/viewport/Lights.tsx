/** Simple studio lighting: ambient fill, a shadow-casting key light and a soft rim light. */
export function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3, 6, 4]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-4, 3, -3]} intensity={0.7} />
    </>
  )
}
