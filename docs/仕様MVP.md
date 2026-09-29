# PoseRef MVP仕様書

> **この文書は、MVP（最初の実装）時点の仕様書です。** 実装とは異なる記述が残っています。
> たとえば、3Dモデルは外部の glTF / GLB ではなく、コードで生成するマネキンになっています。また、MCP によるAIエージェント連携（`set_scene`・`reach` など）は、この文書に含まれていません。
> 現在の仕様は [README](../README.md) を参照してください。

## 1. 概要

PoseRefは、画像生成AIへ渡すための「構図・ポーズ参考画像」をブラウザ上で作成するWebアプリ。

ユーザーは3D人型モデルのポーズとカメラアングルを調整し、完成した構図をPNG画像として保存できる。

主目的は3D作品制作ではなく、画像生成AIに対して

* 人物のポーズ
* カメラアングル
* 人物の向き
* 画面内の配置
* 構図

を視覚的に伝えるための参考画像を作ること。

---

# 2. MVPゴール

ユーザーが以下の流れを完結できること。

1. ブラウザでPoseRefを開く
2. 3D人型モデルを表示する
3. モデルのポーズを変更する
4. カメラ位置を調整する
5. 画角を決定する
6. PNGとして構図画像を保存する
7. 画像生成AI向けプロンプトをコピーする

---

# 3. 技術構成

## Frontend

* React
* TypeScript
* Vite

## 3D

* Three.js
* React Three Fiber
* @react-three/drei

## 3Dモデル

* glTF / GLB形式
* 人型ボーンを持つシンプルなマネキン

モデルは以下を優先する。

* 顔なし
* 単色
* 髪なし
* 衣装なし
* 人体形状が認識できる程度の造形

画像生成AIがキャラクターデザインとして誤認しにくいものとする。

---

# 4. 画面構成

## メイン画面

```text
┌──────────────────────────────┐
│ PoseRef                       │
├───────────────────┬──────────┤
│                   │ Controls │
│                   │          │
│    3D Preview     │ Pose     │
│                   │ Camera   │
│                   │ Export   │
│                   │          │
├───────────────────┴──────────┤
│ AI Prompt                    │
│ [ Copy Prompt ]              │
└──────────────────────────────┘
```

---

# 5. 3Dビュー

## 基本操作

マウス操作で以下を可能にする。

* 左ドラッグ：カメラ回転
* 右ドラッグ：カメラ移動
* ホイール：ズーム

OrbitControlsを使用する。

---

# 6. キャラクター操作

MVPではキャラクター1体のみ。

## Position

* X
* Y
* Z

## Rotation

* Yaw

キャラクター全体を回転できる。

---

# 7. ポーズ編集

主要ボーンを選択できる。

最低限以下を操作対象とする。

* Head
* Neck
* Chest
* Hips
* Left Shoulder
* Right Shoulder
* Left Upper Arm
* Right Upper Arm
* Left Forearm
* Right Forearm
* Left Hand
* Right Hand
* Left Thigh
* Right Thigh
* Left Lower Leg
* Right Lower Leg

ボーンを選択するとRotation UIを表示。

```text
X Rotation
[ slider ]

Y Rotation
[ slider ]

Z Rotation
[ slider ]
```

数値入力も可能にする。

---

# 8. ポーズプリセット

MVPでは以下を実装。

* T-Pose
* Standing
* Arms Crossed
* Peace Sign
* Running
* Sitting
* Looking Back
* Fighting Pose

プリセット選択後に各ボーンを微調整できる。

---

# 9. カメラ設定

以下を操作可能にする。

## Camera

* FOV
* Position
* Rotation

## Preset

* Front
* Back
* Left
* Right
* High Angle
* Low Angle
* Three Quarter

---

# 10. アスペクト比

以下に対応。

* 1:1
* 16:9
* 9:16
* 4:3
* 3:4

画面上に実際の出力範囲を表示する。

---

# 11. 背景

以下から選択。

* White
* Gray
* Black
* Transparent

デフォルトはGray。

---

# 12. PNG Export

現在のカメラビューをPNGとして保存する。

画像サイズ：

* 1024px基準

例：

16:9

```text
1024 × 576
```

9:16

```text
576 × 1024
```

1:1

```text
1024 × 1024
```

UI要素は画像に含めない。

---

# 13. AI Prompt Generator

PNG出力後、以下のプロンプトを生成する。

デフォルト：

「添付した3D参考画像の人物のポーズ、カメラアングル、人物配置、画角、構図を参考にしてください。

3Dモデルそのもののキャラクターデザイン、顔、服装、材質、色は生成画像に反映せず、ポーズと構図情報のみを参考にしてください。」

英語版：

“Use the attached 3D reference image only as a reference for the pose, body orientation, camera angle, framing, and composition.

Do not reproduce the mannequin's character design, face, clothing, colors, or materials. Use only its pose and composition information.”

以下のボタンを配置。

* Copy Japanese Prompt
* Copy English Prompt

---

# 14. Reset

Resetボタンで以下を初期状態へ戻す。

* Character Position
* Character Rotation
* Bone Rotation
* Camera
* FOV
* Aspect Ratio

---

# 15. UI方針

ダークテーマ。

レイアウトは3Dツール寄りだが、Blenderほど複雑にはしない。

重視する項目：

* 直感的
* 操作項目を増やしすぎない
* 3D初心者でも使える
* 画像生成AI用途が分かりやすい

---

# 16. MVPでは実装しないもの

以下は後回し。

* 複数キャラクター
* VRMアップロード
* キャラクター保存
* ポーズ共有
* アカウント
* クラウド保存
* IK
* 手指の詳細操作
* 表情
* 光源編集
* 背景3Dオブジェクト
* AI API連携
* 画像生成機能

---

# 17. 将来機能

## Phase 2

* 2キャラクター配置
* ポーズ保存
* Pose JSON Export / Import
* Undo / Redo
* IK操作
* Dragによる関節操作

## Phase 3

* 3〜5キャラクター配置
* 小物配置
* 椅子
* 机
* 武器
* スマートフォン
* 階段
* 壁

## Phase 4

* VRM読み込み
* キャラクター身長変更
* 体格変更
* Hand Pose Preset
* AI生成向けプロンプト詳細設定

---

# 18. 最重要要件

PoseRefは高機能3Dモデリングツールを目指さない。

最優先するのは、

「画像生成AIへ渡す構図参考画像を素早く作れること」

である。
