import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Color } from 'three'
import { BACKGROUND_MAP } from '../../constants/backgrounds'
import { useAppStore } from '../../store'

/** Applies the selected background color (or transparency) to the scene and renderer. */
export function SceneBackground() {
  const background = useAppStore((state) => state.background)
  const scene = useThree((state) => state.scene)
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    const option = BACKGROUND_MAP[background]
    if (option.color) {
      scene.background = new Color(option.color)
      gl.setClearColor(option.color, 1)
    } else {
      scene.background = null
      gl.setClearColor(0x000000, 0)
    }
  }, [background, scene, gl])

  return null
}
