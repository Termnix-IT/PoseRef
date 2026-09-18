import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { PromptPanel } from './components/panels/PromptPanel'
import { Viewport } from './components/viewport/Viewport'

export default function App() {
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
