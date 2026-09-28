import { ASPECT_RATIOS } from '../src/constants/aspectRatios.ts'
import { BONES, HIPS_BASE_Y } from '../src/constants/bones.ts'
import { CAMERA_PRESETS, DEFAULT_FOV } from '../src/constants/cameraPresets.ts'
import { POSE_PRESET_MAP } from '../src/constants/posePresets.ts'
import type { PosePresetId, Vec3 } from '../src/types/index.ts'
import { RANGES } from './sceneSchema.ts'

/** Presets quoted in full as worked examples. Chosen to cover arms, sitting and lying. */
const EXAMPLE_PRESETS: PosePresetId[] = ['standing', 'handsOnHips', 'pointing', 'sitting', 'kneeling', 'lyingDown']

const fmt = (value: number) => String(Math.round(value * 1000) / 1000)
const vec = (v: Vec3) => `(${fmt(v.x)}, ${fmt(v.y)}, ${fmt(v.z)})`
const range = (r: { min: number; max: number }) => `${r.min}..${r.max}`

function boneTable(): string {
  const rows = BONES.map(
    (bone) => `| ${bone.id} | ${bone.parent ?? '(root)'} | ${vec(bone.offset)} | ${bone.label} |`,
  )
  return ['| id | parent | pivot offset from parent pivot (m) | Japanese name |', '|---|---|---|---|', ...rows].join('\n')
}

function presetExamples(): string {
  return EXAMPLE_PRESETS.map((id) => {
    const preset = POSE_PRESET_MAP[id]
    const pose = { bones: preset.bones, ...(preset.rootOffset ? { rootOffset: preset.rootOffset } : {}) }
    return `${preset.labelEn} (${preset.label}):\n\`${JSON.stringify(pose)}\``
  }).join('\n\n')
}

function cameraTable(): string {
  const rows = CAMERA_PRESETS.map((preset) => `| ${preset.id} (${preset.label}) | ${vec(preset.position)} | ${vec(preset.target)} |`)
  return ['| preset | position | target |', '|---|---|---|', ...rows].join('\n')
}

/**
 * Pose authoring guide handed to AI agents by the `get_pose_spec` tool. Bone
 * layout, examples, cameras and ranges are read from the app's own constants so
 * the guide cannot drift from the code; the axis conventions are prose.
 */
export function buildPoseSpec(): string {
  return `# PoseRef pose authoring guide

PoseRef poses a featureless mannequin and frames it with a camera to make reference images for image AIs.
You edit the scene with \`set_scene\` and check the result with \`render_views\`.

## Workflow
1. \`get_scene\` if you need the current state (for small edits use pose.mode "merge").
2. \`set_scene\` with pose, and camera if the request mentions an angle or composition.
3. \`render_views\` (current + front + left by default) and compare the picture with the request.
4. For contact (hand on hip, elbow on knee, hands on the floor), place it with \`reach\` (see "Contact with reach")
   and confirm with \`get_joint_positions\`; pictures are easy to misjudge. Feet-on-floor is handled by
   set_scene's automatic grounding.
5. Fix what is wrong and render again. Two or three rounds are usually enough: the user fine-tunes by hand afterwards.
If a combined pose + camera change keeps failing, settle the pose first, then the camera.

## World and character axes
- The character stands at the origin facing +Z. +X is the CHARACTER'S LEFT, +Y is up. Units are meters.
- Seen from a front camera (+Z), the character's left side appears on the RIGHT of the image.
- \`character.yaw\` turns the whole body around Y; +90 makes it face +X.

## Bones
Rotations are local Euler angles in degrees, order XYZ (three.js: Z is applied first, then Y, then X),
relative to the parent bone. A parent's rotation carries all of its children.
Standing height: hips pivot ${fmt(HIPS_BASE_Y)} m above the floor, top of head about 1.72 m.
The hand extends about 0.18 m past the wrist; the sole is about 0.48 m below the knee pivot.

${boneTable()}

## Where a hanging limb points (upper arm, forearm, hand, thigh, lower leg)
At rest these point down (-Y). With rotation (x, y = 0, z) a limb points at
\`dir = ( sin z, -cos z * cos x, -cos z * sin x )\` in its parent's space
(+X = character's left, +Y = up, +Z = forward).
- Arms: x < 0 swings the arm forward and up, x > 0 swings it back.
  Left arm z > 0 raises it sideways; the RIGHT arm uses z < 0 (mirrored).
  Straight overhead: left z = 170..180 (right z = -170..-180), or x = -170..-180.
- Elbow: forearm x < 0 folds the forearm forward relative to the upper arm; -90 is a right angle.
- Legs: thigh x < 0 lifts the leg forward (-90 = horizontal, as when sitting), x > 0 moves it behind.
  Left thigh z > 0 spreads it outward; the right thigh uses z < 0.
- Knee: lower leg x > 0 folds the shin backward; 90 is a right angle.
- y on a limb only twists it around its own length.

## Torso, neck and head (they point up)
- x > 0 bends forward, x < 0 leans back.
- y > 0 turns toward the character's LEFT.
- z > 0 tilts sideways toward the character's RIGHT (-X).
- hips rotate the whole body; hips x = -90 lays it on its back.

## Common mistakes
- Bending the chest forward also swings the arms backward, because they hang from the chest.
  When the chest leans by +a degrees, subtract about a from the upper arms' x to keep them pointing the same way in the world.
- Left and right use opposite z signs for arms and legs. Check the rendered front view: the character's
  left hand is on the image's right.
- Poses where body parts touch (hand on chin, elbow on knee) rarely land on the first try. Measure with
  \`get_joint_positions\`: limb radii are about upper arm 0.05, forearm 0.043, thigh 0.068, shin 0.052 m and the
  hand is 0.02-0.04 m thick, so an elbow resting on a knee is ~0.11 m from it and a palm on the chin is ~0.03-0.06 m.

## Composition and readability
The picture is a reference for an image AI, so the pose must read from its silhouette in the 'current' view.
- Decide first where the character acts toward (a target, a direction of travel, something it looks at), then
  place that direction across the picture rather than straight at or away from the camera, so the key limbs are
  seen from the side instead of foreshortened.
- Actions aimed at a target are done side-on: drawing a bow, aiming a rifle, throwing, swinging a bat, club or
  racket. The lead side (for a right-handed person the left arm and left shoulder) faces the target, the chest
  faces 90 degrees away from it, and the head turns toward the target. Turn the character with \`character.yaw\`
  and keep the target direction across the frame.
- In render_views, check that the arms and legs that carry the action do not overlap the torso or each other and
  do not point at the camera. If they do, turn the character or move the camera before fine-tuning angles.

## Contact with reach (inverse kinematics)
\`reach\` moves a landmark (effector) onto another landmark or a world point by rotating a chain of bones, so you
do not have to work out the angles. Elbows and knees only bend the natural way; chest, neck and head stay within
natural limits.
- Default chains: elbow -> upper arm; wrist, palm, fingertips -> upper arm + forearm; knee -> thigh;
  ankle, sole, toe -> thigh + lower leg; chin, nose, head -> neck + head; neckBase -> chest.
- Goals are solved in order and re-checked on every pass. Bones used by an earlier goal are left out of later
  goals' default chains, so list the contact that must hold most firmly first.
- \`offset\` is added to the target in world space. Joint landmarks sit inside the limbs, so leave the limb radii
  between them: an elbow resting on top of a knee is
  \`{"effector":"rightElbow","target":"rightKnee","offset":{"x":0,"y":0.11,"z":0}}\`.
- If a goal is reported NOT reached, the body is too far away for that chain. Change the rough pose, add a parent
  bone to its chain (e.g. \`["chest","rightUpperArm"]\`), or add a second goal that moves the other body part
  toward the first.
- Two goals that only point at each other can meet anywhere. Anchor one to a place: hands together in front of the
  chest is rightPalm -> a world point such as \`{"x":0,"y":1.25,"z":0.3}\`, then leftPalm -> rightPalm.
- Straight limbs bend with the elbow down and slightly out and back, and the knee forward; an already bent limb
  keeps its bend direction, so pre-bend it in the rough pose if you want another direction.
- Hand on hip: \`{"goals":[{"effector":"leftPalm","target":"pelvis","offset":{"x":0.17,"y":0.02,"z":0}}]}\`
  (offsets are in world space; rotate them when the character is turned).

## Grounding (pose.rootOffset)
\`set_scene\` grounds the body for you: after applying a pose it raises or lowers the hips so the lowest body
point (sole, knee, buttocks or back) rests on the floor, and reports how far it moved them. You only need a
rough rootOffset.y. For a chair pose the feet end up on the floor and the body sits in the air, because there is
no chair. For jumps or other airborne poses pass \`pose.ground: false\` and set rootOffset.y yourself (a mid-jump
preset uses +0.25).

## Camera
\`camera.position\` and \`camera.target\` are in meters, \`camera.fov\` is the vertical field of view in degrees
(default ${DEFAULT_FOV}). High angle: raise position.y to 3..4. Low angle: position.y 0.2..0.4 with target.y about 1.0.
A lower fov from farther away flattens perspective.

${cameraTable()}

Aspect ratios: ${ASPECT_RATIOS.map((option) => option.id).join(', ')}.

## Accepted ranges
Bone angles ${range(RANGES.angle)} (normalized to -180..180), rootOffset ${range(RANGES.rootOffset)},
character position x ${range(RANGES.characterX)} / y ${range(RANGES.characterY)} / z ${range(RANGES.characterZ)},
camera position ${range(RANGES.cameraPosition)}, camera target ${range(RANGES.cameraTarget)}, fov ${range(RANGES.fov)}.

## Examples (pose.bones and rootOffset of built-in presets)
${presetExamples()}
`
}
