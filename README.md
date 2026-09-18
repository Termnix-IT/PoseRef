# PoseRef

画像生成AIへ渡す「構図・ポーズ参考画像」をブラウザ上で素早く作るための Web アプリです。
顔・髪・衣装を持たない単色マネキンのポーズとカメラ構図を調整し、3D ビューを PNG として書き出し、
参考画像用のプロンプト（日本語 / 英語）をコピーできます。

## 技術スタック

- React 19 / TypeScript / Vite
- Three.js / React Three Fiber / @react-three/drei
- Zustand（状態管理）

## セットアップ

```bash
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

```bash
npm run build     # 型チェック + 本番ビルド（dist/）
npm run typecheck # 型チェックのみ
npm run preview   # ビルド結果のプレビュー
```

## 画面構成

| 領域 | 内容 |
| --- | --- |
| 左 | 3D Preview（表示範囲 = 書き出し範囲。アスペクト比に合わせてレターボックス表示） |
| 右 | Pose / Character / Camera / Aspect Ratio / Background / Export |
| 下 | AI Prompt Generator（Copy Japanese Prompt / Copy English Prompt） |

### 3D ビュー操作

- 左ドラッグ: カメラ回転 / 右ドラッグ: 移動 / ホイール: ズーム
- マネキンの部位をクリックするとそのボーンが選択され、右パネルに Rotation スライダーが表示されます
- 何もない場所をクリックすると選択解除

### 主な機能

- ポーズプリセット: T-Pose / Standing / Arms Crossed / Peace Sign / Running / Sitting / Looking Back / Fighting Pose
- 16 ボーンの X/Y/Z 回転（スライダー + 数値入力）
- キャラクターの Position (X/Y/Z) と Yaw、マネキン色（背景とのコントラスト調整用）
- カメラプリセット: Front / Back / Left / Right / High Angle / Low Angle / Three Quarter
- FOV、Orbit（Yaw / Pitch / Distance）、Position / Look At の数値指定
- アスペクト比: 1:1 / 16:9 / 9:16 / 4:3 / 3:4（1024px 基準、2048px も選択可）
- 背景: White / Gray / Black / Transparent、床グリッドと影の ON/OFF
- PNG Export（UI・選択ハイライトを含まない 3D ビューのみ）、画像のクリップボードコピー
- プロンプト生成（構図情報の自動追記 ON/OFF）
- Reset All（ポーズ・キャラクター・カメラ・FOV・アスペクト比を初期化）

## ディレクトリ構成

```
src/
  components/
    layout/    Header, Sidebar
    panels/    Pose / Character / Camera / AspectRatio / Background / Export / Prompt
    ui/        Button, SliderField, NumberInput, SegmentedControl, Section, Toggle, VectorFields
    viewport/  Viewport, SceneCanvas, CameraRig, Mannequin, Ground, Lights, SceneBackground, ExportBridge
  constants/   bones（ボーン階層・マネキン形状）, posePresets, cameraPresets, aspectRatios, backgrounds, prompts
  hooks/       useFitAspect, useExport, useCopyText
  store/       Zustand ストア（slices: character / pose / camera / view / export）
  types/       共通型定義
  utils/       math, exportPng, composition, promptBuilder, clipboard, download
```

## マネキンについて

外部モデルには依存せず、カプセル・楕円体プリミティブを階層化してコードで生成しています。
頭部には向きを判別するためのごく小さな鼻の膨らみのみを付けています（`src/constants/bones.ts` の
`MANNEQUIN_PARTS` で調整・削除できます）。

座標系: キャラクターは +Z を向き、+X がキャラクターの左側です。
四肢はローカル -Y 方向に伸びるため、腕・脚は X 回転がマイナスで前方へ振り上がります。
