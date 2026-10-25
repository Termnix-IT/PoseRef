import { CommandPalette } from './components/layout/CommandPalette'
import { Inspector } from './components/layout/Inspector'
import { StatusBar } from './components/layout/StatusBar'
import { Toolbar } from './components/layout/Toolbar'
import { PromptPanel } from './components/panels/PromptPanel'
import { Viewport } from './components/viewport/Viewport'
import { useShortcuts } from './hooks/useShortcuts'
import { UI } from './constants/uiText'
import { useAppStore } from './store'

export default function App() {
  useShortcuts()
  const uiHidden = useAppStore((state) => state.uiHidden)
  const setUiHidden = useAppStore((state) => state.setUiHidden)

  // Hidden parts stay mounted (only collapsed by CSS) so their state and shortcuts such as Ctrl+S keep working.
  return (
    <div className={`app${uiHidden ? ' app--ui-hidden' : ''}`}>
      <Toolbar />
      <main className="app__main">
        <Viewport />
        <Inspector />
      </main>
      <PromptPanel />
      <StatusBar />
      <CommandPalette />
      {uiHidden ? (
        <button type="button" className="show-ui" title={UI.app.showUiTitle} onClick={() => setUiHidden(false)}>
          {UI.app.showUi}
        </button>
      ) : null}
    </div>
  )
}
