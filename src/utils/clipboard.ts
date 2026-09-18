import { UI } from '../constants/uiText'

function copyTextLegacy(text: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } finally {
    textarea.remove()
  }
  if (!ok) throw new Error(UI.export.clipboardFailed)
}

/** Copies text using the async Clipboard API, falling back to execCommand when it is unavailable or denied. */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Permission denied or insecure context: fall through to the legacy path.
    }
  }
  copyTextLegacy(text)
}

export function canCopyImages(): boolean {
  return typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard?.write === 'function'
}

export async function copyImageBlob(blob: Blob): Promise<void> {
  if (!canCopyImages()) throw new Error(UI.export.imageClipboardUnsupported)
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
}
