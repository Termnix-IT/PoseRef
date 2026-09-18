# PoseRef

画像生成AIへ渡す「構図・ポーズ参考画像」をブラウザ上で素早く作るための Web アプリです。
顔・髪・衣装を持たない単色マネキンのポーズとカメラ構図を調整し、3D ビューを PNG として書き出し、
参考画像用のプロンプト（日本語 / 英語）をコピーできます。UI は日本語です。

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
| 左 | 3D プレビュー（表示範囲 = 書き出し範囲。アスペクト比に合わせてレターボックス表示） |
| 右 | ポーズ / キャラクター / カメラ / アスペクト比 / 背景 / 書き出し |
| 下 | AIプロンプト生成（日本語プロンプトをコピー / 英語プロンプトをコピー） |

### 3D ビュー操作

- 左ドラッグ: カメラ回転 / 右ドラッグ: 移動 / ホイール: ズーム
- マネキンの部位をクリックするとそのボーンが選択され、右パネルに回転スライダーが表示されます
- 何もない場所をクリックすると選択解除

### ポーズプリセット（24種）

| グループ | プリセット |
| --- | --- |
| 立ち | Tポーズ / 立ち / 腰に手 / 腕組み / 後ろ手 / モデル立ち / 振り返り |
| 仕草 | ピース / 手を振る / 指差し / 考える / 敬礼 / バンザイ / 後頭部に手 |
| 動き | 歩く / 走る / ジャンプ / 構え |
| 座り・寝 | 椅子に座る / 体育座り / 片膝立ち / 正座 / しゃがむ / 仰向け |

プリセット適用後も各ボーンを個別に調整できます（調整するとプリセット表示は「カスタム」になります）。
「振り返り」はポーズのみを変えるので、カメラプリセット「背面」と組み合わせると振り返り構図になります。

### その他の機能

- 16 ボーンの X/Y/Z 回転（スライダー + 数値入力）
- キャラクターの位置 (X/Y/Z) と向き (Yaw)、マネキンの色（背景とのコントラスト調整用）
- カメラプリセット: 正面 / 背面 / 左側面 / 右側面 / ハイアングル / ローアングル / 斜め前
- 画角 (FOV)、オービット（水平 / 上下 / 距離）、位置 / 注視点の数値指定
- アスペクト比: 1:1 / 16:9 / 9:16 / 4:3 / 3:4（1024px 基準、2048px も選択可）
- 背景: 白 / グレー / 黒 / 透過、床グリッドと接地影の ON/OFF
- PNG 書き出し（UI・選択ハイライトを含まない 3D ビューのみ）、画像のクリップボードコピー
- プロンプト生成（構図情報の自動追記 ON/OFF）
- すべてリセット（ポーズ・キャラクター・カメラ・画角・アスペクト比を初期化）

## ディレクトリ構成

```
src/
  components/
    layout/    Header, Sidebar
    panels/    Pose / Character / Camera / AspectRatio / Background / Export / Prompt
    ui/        Button, SliderField, NumberInput, SegmentedControl, Section, Toggle, VectorFields
    viewport/  Viewport, SceneCanvas, CameraRig, Mannequin, Ground, Lights, SceneBackground, ExportBridge
  constants/   bones（ボーン階層・マネキン形状）, posePresets, cameraPresets, aspectRatios, backgrounds,
               prompts, uiText（UI 文言）
  hooks/       useFitAspect, useExport, useCopyText
  store/       Zustand ストア（slices: character / pose / camera / view / export）
  types/       共通型定義
  utils/       math, exportPng, composition, promptBuilder, clipboard, download
```

UI の文言は `src/constants/uiText.ts` に集約しています。ポーズを追加する場合は
`src/constants/posePresets.ts` にプリセットを追記し、`src/types/index.ts` の `PosePresetId` に ID を加えます。

## マネキンについて

外部モデルには依存せず、カプセル・楕円体プリミティブを階層化してコードで生成しています。
頭部には向きを判別するためのごく小さな鼻の膨らみのみを付けています（`src/constants/bones.ts` の
`MANNEQUIN_PARTS` で調整・削除できます）。

座標系: キャラクターは +Z を向き、+X がキャラクターの左側です。
四肢はローカル -Y 方向に伸びるため、腕・脚は X 回転がマイナスで前方へ振り上がります。
