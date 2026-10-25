import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createZeroRotations } from '../src/constants/bones.ts'
import { POSE_PRESETS } from '../src/constants/posePresets.ts'
import type { BoneId } from '../src/types/index.ts'
import { poseFigure } from '../src/utils/poseThumbnail.ts'

describe('pose thumbnails', () => {
  test('every preset fits the 100-unit box with the head on top when standing', () => {
    for (const preset of POSE_PRESETS) {
      const bones = createZeroRotations()
      for (const [bone, rotation] of Object.entries(preset.bones)) bones[bone as BoneId] = { ...rotation }
      const figure = poseFigure(bones, preset.rootOffset ?? { x: 0, y: 0, z: 0 })
      assert.equal(figure.segments.length, 18, preset.id)
      for (const { from, to } of figure.segments) {
        for (const value of [...from, ...to]) assert.ok(value >= -0.001 && value <= 100.001, `${preset.id} out of box: ${value}`)
      }
      if (preset.group === 'standing') {
        const feet = Math.max(...figure.segments.map((segment) => Math.max(segment.from[1], segment.to[1])))
        assert.ok(figure.head.center[1] < feet - 50, `${preset.id} head should be well above the feet`)
      }
    }
  })
})
