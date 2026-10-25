import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createZeroRotations, MANNEQUIN_COLORS } from '../src/constants/bones.ts'
import { parseSavedScene, serializeSavedScene, type SavedSceneState } from '../src/utils/savedScene.ts'

function sampleState(): SavedSceneState {
  const bones = createZeroRotations()
  bones.leftUpperArm = { x: -10, y: 5, z: 80 }
  return {
    pose: { bones, rootOffset: { x: 0, y: -0.2, z: 0 }, presetId: 'custom' },
    character: { position: { x: 0.5, y: 0, z: -0.3 }, yaw: 45, color: MANNEQUIN_COLORS[2].value },
    camera: { fov: 30, position: { x: 1, y: 1.4, z: 3 }, target: { x: 0, y: 0.9, z: 0 } },
    activeCameraPreset: 'custom',
    aspectRatio: '9:16',
    background: 'transparent',
    showGrid: false,
    showShadow: true,
    exportScale: 2,
    promptLanguage: 'en',
    includePromptDetails: false,
    agentEnabled: true,
  }
}

describe('saved scene', () => {
  test('restores everything it saved', () => {
    const state = sampleState()
    // Extra store fields (selection, history) are not saved.
    const raw = serializeSavedScene({ ...state, selectedBone: 'head', canUndo: true } as SavedSceneState)
    assert.deepEqual(parseSavedScene(raw), state)
    assert.equal(JSON.parse(raw).selectedBone, undefined)
  })

  test('ignores missing, unreadable and other-version data', () => {
    assert.deepEqual(parseSavedScene(null), {})
    assert.deepEqual(parseSavedScene('{not json'), {})
    assert.deepEqual(parseSavedScene('[1,2]'), {})
    const otherVersion = JSON.parse(serializeSavedScene(sampleState()))
    otherVersion.version = 99
    assert.deepEqual(parseSavedScene(JSON.stringify(otherVersion)), {})
  })

  test('drops only the fields that are damaged or out of range', () => {
    const data = JSON.parse(serializeSavedScene(sampleState()))
    data.pose.bones.head = { x: 'a', y: 0, z: 0 }
    data.camera.fov = 500
    data.activeCameraPreset = 'front'
    data.aspectRatio = '21:9'
    data.showGrid = 'yes'
    data.character.color = '#ff00ff'
    const parsed = parseSavedScene(JSON.stringify(data))
    assert.equal(parsed.pose, undefined)
    assert.equal(parsed.camera, undefined)
    // The preset only described the dropped camera.
    assert.equal(parsed.activeCameraPreset, undefined)
    assert.equal(parsed.aspectRatio, undefined)
    assert.equal(parsed.showGrid, undefined)
    assert.equal(parsed.character?.color, MANNEQUIN_COLORS[0].value)
    assert.equal(parsed.background, 'transparent')
    assert.equal(parsed.exportScale, 2)
  })

  test('keeps a camera zoomed out beyond the position fields range', () => {
    const state = sampleState()
    state.camera = { ...state.camera, position: { x: 0, y: 1, z: 15.5 }, target: { x: 0, y: 1, z: 3.5 } }
    assert.deepEqual(parseSavedScene(serializeSavedScene(state)).camera, state.camera)
  })

  test('rejects a camera sitting on its own look-at point and unknown preset ids', () => {
    const data = JSON.parse(serializeSavedScene(sampleState()))
    data.camera.position = { ...data.camera.target }
    data.pose.presetId = 'flying'
    const parsed = parseSavedScene(JSON.stringify(data))
    assert.equal(parsed.camera, undefined)
    assert.equal(parsed.pose?.presetId, 'custom')
  })
})
