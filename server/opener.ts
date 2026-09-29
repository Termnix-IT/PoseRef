import { openBrowser } from './browser.ts'

const TAB_WAIT_MS = 20_000
const POLL_MS = 300
/**
 * Automatic opening (a tool found no tab) happens at most this often, so a user
 * who closes the tab on purpose is not handed a new one on every tool call.
 * An explicit open_poseref call is never throttled.
 */
const AUTO_OPEN_COOLDOWN_MS = 60_000

export interface OpenResult {
  /** The page the user should see. */
  url: string
  /** Connected PoseRef tabs after the call. */
  tabs: number
  /** A browser window was opened by this call. */
  opened: boolean
  /** The PoseRef server was started by this call. */
  startedServer: boolean
  /** Opening is turned off (POSEREF_NO_OPEN), so the user has to open the page. */
  disabled: boolean
}

export interface PageOpenerOptions {
  url: string
  enabled: boolean
  log: (message: string) => void
  /** Replaced in tests so no real browser opens. */
  openPage?: (url: string) => void
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Decides whether to open the PoseRef page, opens it, and waits for the tab to connect. */
export class PageOpener {
  private readonly options: PageOpenerOptions
  private lastAutoOpen = Number.NEGATIVE_INFINITY

  constructor(options: PageOpenerOptions) {
    this.options = options
  }

  get url(): string {
    return this.options.url
  }

  async ensureTab(automatic: boolean, countTabs: () => Promise<number>): Promise<Omit<OpenResult, 'url' | 'startedServer'>> {
    let tabs = await countTabs()
    // An open tab is enough: opening another would only duplicate it.
    if (tabs > 0) return { tabs, opened: false, disabled: false }
    if (!this.options.enabled) return { tabs, opened: false, disabled: true }
    if (automatic) {
      if (Date.now() - this.lastAutoOpen < AUTO_OPEN_COOLDOWN_MS) return { tabs, opened: false, disabled: false }
      this.lastAutoOpen = Date.now()
    }
    ;(this.options.openPage ?? ((url) => openBrowser(url, this.options.log)))(this.options.url)
    const deadline = Date.now() + TAB_WAIT_MS
    while (tabs === 0 && Date.now() < deadline) {
      await sleep(POLL_MS)
      tabs = await countTabs()
    }
    return { tabs, opened: true, disabled: false }
  }
}
