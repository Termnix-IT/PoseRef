import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { PromptPanel } from './components/panels/PromptPanel'
import { Viewport } from './components/viewport/Viewport'
import { useUndoShortcut } from './hooks/useUndoShortcut'

export default function App() {
  useUndoShortcut()

  return (
    <div className="app">
      <Header />
      <main className="app__main">
        <Viewport />
        <Sidebar />
      </main>
      <PromptPanel />
    </div>
  )
}
