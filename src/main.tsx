import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useAppStore } from './store'
import './styles/global.css'
import './styles/layout.css'
import './styles/components.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

if (import.meta.env.DEV) {
  // Handy for debugging from the browser console during development only.
  ;(window as unknown as { __poseref: typeof useAppStore }).__poseref = useAppStore
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
