import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { UI } from '../../constants/uiText'
import { filterCommands, useCommands } from '../../hooks/useCommands'
import { useDismiss } from '../../hooks/useDismiss'
import { useAppStore } from '../../store'

/**
 * Ctrl+K search over every action in the app. Type to filter, move with the
 * arrow keys, run with Enter; Escape or a click outside closes it.
 */
export function CommandPalette() {
  const open = useAppStore((state) => state.paletteOpen)
  return open ? <PaletteDialog /> : null
}

function PaletteDialog() {
  const setPaletteOpen = useAppStore((state) => state.setPaletteOpen)
  const commands = useCommands()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const close = useCallback(() => setPaletteOpen(false), [setPaletteOpen])
  useDismiss(panelRef, true, close)

  const results = useMemo(() => filterCommands(commands, query), [commands, query])
  const current = results[Math.min(active, results.length - 1)]

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active, results])

  const run = (index: number) => {
    const command = results[index]
    if (!command) return
    close()
    command.run()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') setActive((index) => Math.min(index + 1, results.length - 1))
    else if (event.key === 'ArrowUp') setActive((index) => Math.max(index - 1, 0))
    else if (event.key === 'Enter') run(Math.min(active, results.length - 1))
    else return
    event.preventDefault()
  }

  return (
    <div className="palette-backdrop">
      <div className="palette" ref={panelRef} role="dialog" aria-modal="true" aria-label={UI.commands.title}>
        <input
          className="palette__input"
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={current ? `${listId}-${current.id}` : undefined}
          placeholder={UI.commands.placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={handleKeyDown}
        />
        <ul className="palette__list" id={listId} role="listbox" ref={listRef}>
          {results.length === 0 ? <li className="palette__empty">{UI.commands.empty}</li> : null}
          {results.map((command, index) => (
            <li
              key={command.id}
              id={`${listId}-${command.id}`}
              role="option"
              aria-selected={command === current}
              className={`palette__item${command === current ? ' is-active' : ''}`}
              onPointerMove={() => setActive(index)}
              onClick={() => run(index)}
            >
              <span className="palette__label">{command.label}</span>
              <span className="palette__group">{command.group}</span>
              {command.shortcut ? <kbd className="kbd">{command.shortcut}</kbd> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
