import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createHistory } from '../src/utils/history.ts'

describe('undo history', () => {
  test('groups every change until the group is closed', () => {
    const history = createHistory<number>(10)
    // One drag: 0 -> 1 -> 2 -> 3 is a single step back to 0.
    history.record(0)
    history.record(1)
    history.record(2)
    history.close()
    assert.equal(history.undo(3), 0)
    assert.equal(history.canUndo(), false)
  })

  test('redoes what was undone, and a new change drops the redo stack', () => {
    const history = createHistory<number>(10)
    history.record(0)
    history.close()
    history.record(1)
    history.close()
    assert.equal(history.undo(2), 1)
    assert.equal(history.undo(1), 0)
    assert.equal(history.redo(0), 1)
    assert.equal(history.canRedo(), true)
    history.record(1)
    assert.equal(history.canRedo(), false)
    assert.equal(history.redo(5), null)
  })

  test('undo closes an open group so the next change is a new step', () => {
    const history = createHistory<number>(10)
    history.record(0)
    assert.equal(history.undo(1), 0)
    history.record(0)
    history.close()
    assert.equal(history.undo(7), 0)
    assert.equal(history.redo(0), 7)
  })

  test('keeps only the most recent steps', () => {
    const history = createHistory<number>(2)
    for (const value of [0, 1, 2]) {
      history.record(value)
      history.close()
    }
    assert.equal(history.undo(3), 2)
    assert.equal(history.undo(2), 1)
    assert.equal(history.undo(1), null)
  })
})
