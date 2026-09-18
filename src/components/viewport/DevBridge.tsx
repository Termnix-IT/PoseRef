import { useStore } from '@react-three/fiber'
import { useEffect } from 'react'

/** Development-only helper exposing the R3F root store on window for console debugging. */
export function DevBridge() {
  const store = useStore()
  useEffect(() => {
    const target = window as unknown as { __r3f?: typeof store }
    target.__r3f = store
    return () => {
      delete target.__r3f
    }
  }, [store])
  return null
}
