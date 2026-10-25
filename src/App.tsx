import { Inspector } from './components/layout/Inspector'
import { StatusBar } from './components/layout/StatusBar'
import { Toolbar } from './components/layout/Toolbar'
import { PromptPanel } from './components/panels/PromptPanel'
import { Viewport } from './components/viewport/Viewport'
import { useShortcuts } from './hooks/useShortcuts'

export default function App() {
  useShortcuts()

  return (
    <div className="app">
      <Toolbar />
      <main className="app__main">
        <Viewport />
        <Inspector />
      </main>
      <PromptPanel />
      <StatusBar />
    </div>
  )
}
