# PoseRef

画像生成AIへ渡す「構図・ポーズ参考画像」をブラウザ上で素早く作るための Web アプリです。
顔・髪・衣装を持たない単色マネキンのポーズとカメラ構図を調整し、3D ビューを PNG として書き出し、
参考画像用のプロンプト（日本語 / 英語）をコピーできます。UI は日本語です。
MCP に対応した AI エージェント（Claude Code / Codex）から、文章の指示でポーズとカメラを作らせることもできます。

## 技術スタック

- React 19 / TypeScript / Vite
- Three.js / React Three Fiber / @react-three/drei
- Zustand（状態管理）
- Node.js サーバー（`server/`）: MCP エンドポイントとブラウザへの中継。MCP SDK v2 / ws / zod

## セットアップ

Node.js 22.18 以上が必要です（サーバーの TypeScript を Node が直接実行するため）。
リポジトリはどこに置いてもかまいません。

```bash
npm install
npm start
```

`npm start` はビルドしてから PoseRef サーバーを `http://127.0.0.1:47173` で起動し、ブラウザで画面を開きます。
ブラウザを自動で開きたくない場合は `POSEREF_NO_OPEN=1` を、別のポートを使う場合は `POSEREF_PORT` を指定します。
サーバーは `127.0.0.1` でのみ待ち受けるので、同じ PC の外からは接続できません。

開発時は次のコマンドを使います。

```bash
npm run dev       # Vite 開発サーバー（http://localhost:5173）。MCP も 47173 番で同時に起動する
npm run build     # 型チェック + 本番ビルド（dist/）
npm run typecheck # 型チェックのみ
npm run preview   # ビルド結果のプレビュー（AI 連携なし）
```

`npm start` と `npm run dev` は同じ 47173 番を使うので、同時には起動できません。

## AI エージェント連携（MCP）

PoseRef サーバーは MCP（Model Context Protocol）のエンドポイント `http://127.0.0.1:47173/mcp` を持っています。
Claude Code や Codex に一度登録しておくと、どのディレクトリで起動したエージェントからでも
「PoseRef で、椅子に座って頬杖をつくポーズを斜め前から」のように頼むだけで、開いているブラウザの PoseRef が変わります。
3D の描画はブラウザで行うので、使うときは `npm start` を実行して PoseRef の画面を開いておいてください。
ヘッダーに「AI連携: 接続中」と表示されていれば準備できています。

### 登録（最初の 1 回だけ）

Claude Code（`--scope user` にすると、どのディレクトリで起動しても使えます）:

```bash
claude mcp add --transport http --scope user poseref http://127.0.0.1:47173/mcp
```

リポジトリには `.mcp.json` も入れてあるので、このリポジトリの中で Claude Code を起動した場合は登録しなくても使えます
（初回に使用を許可するかどうかを聞かれます）。
Claude Code はツールを呼ぶたびに許可を求めることがあります。毎回の確認を省く場合は、`~/.claude/settings.json` の
`permissions.allow` に `"mcp__poseref"` を加えると、PoseRef のツールすべてが許可されます。

Codex（CLI・IDE 拡張・デスクトップアプリ共通の `~/.codex/config.toml` に追記します）:

```toml
[mcp_servers.poseref]
url = "http://127.0.0.1:47173/mcp"

[mcp_servers.poseref.tools.set_scene]
approval_mode = "approve"
```

Codex は、読み取り専用ではない MCP ツールを呼ぶたびに承認を求めます。`set_scene` は PoseRef の画面だけを変える操作で、
「元に戻す」で取り消せるので、上の 2 行で毎回の承認を省いています。省かない場合は、ポーズを直すたびに承認することになります。
また `codex exec` のような非対話の実行では、承認できないため `set_scene` がキャンセルされます。

`POSEREF_PORT` でポートを変えた場合は、登録する URL のポートも合わせて変えてください。
エージェントは起動時に MCP へ接続するので、PoseRef サーバーを後から起動したときはエージェントを再起動するか、
Claude Code なら `/mcp` から再接続します。

### エージェントが使うツール

| ツール | 内容 |
| --- | --- |
| `get_pose_spec` | ボーンの軸と符号の決まり、接地、カメラ、プリセットの実例をまとめた説明書を返す。内容はコードの定数から生成される |
| `get_scene` | 現在のポーズ・キャラクターの向きと位置・カメラ・アスペクト比を JSON で返す |
| `set_scene` | ポーズ・キャラクター・カメラ・アスペクト比を適用する。ポーズを指定したときは、体の最下点が床にちょうど着くよう腰の高さを自動で合わせる（ジャンプなどは `pose.ground: false` で無効にできる）。未知のボーン名や範囲外の値は、何も適用せずにエラーを返す |
| `render_views` | 現在のカメラ・正面・側面・真上などを 1 枚の PNG に並べて返す。同じ画像を一時フォルダにも保存し、そのパスを返す |
| `get_joint_positions` | 肘・手のひら・膝・足裏・顎などの位置（メートル）と、体の最下点の高さを返す。指定した 2 点の距離も計算し、手が顎に触れているか、足が床に着いているかを数値で確かめるのに使う |

エージェントは `set_scene` と `render_views` を繰り返し、描画結果を見ながらポーズを直します。
仕上がりは「大まかに合っている」程度を想定しているので、細部は手で調整してください。
AI による変更は、ヘッダーの「元に戻す」（または Ctrl+Z）で 1 回ずつ取り消せます。
`render_views` が画像をファイルにも保存するのは、MCP の画像をモデルに渡せないクライアントでも、
エージェントがそのファイルを開いて確認できるようにするためです。

PoseRef のタブを複数開いている場合は、最後に操作したタブが対象になります。

## 画面構成

| 領域 | 内容 |
| --- | --- |
| 左 | 3D プレビュー（表示範囲 = 書き出し範囲。アスペクト比に合わせてレターボックス表示） |
| 右 | ポーズ / キャラクター / カメラ / アスペクト比 / 背景 / 書き出し |
| 下 | AIプロンプト生成（日本語 / English を切り替え、見出しクリックで開閉） |

### 操作モード

ヘッダーの「カメラ操作 / ポーズ操作」で、3Dビュー上の左ドラッグが何をするかを切り替えます。

カメラ操作モードでは、どこをドラッグしてもカメラが動きます。ポーズが崩れる心配なくアングルを探せます。
ポーズ操作モードでは、マネキンの体や青いハンドルをドラッグすると、その部位のボーンが回転します。
背景をドラッグしたときはこのモードでもカメラが回るので、アングルを変えながらポーズを直せます。

ハンドルはボーンの先端に置かれた青い球で、ポーズ操作モードのときだけ表示されます。
肘のハンドルを引くと上腕が、手首のハンドルを引くと前腕が振られます。顔の前のハンドルは首の向き、
胸のハンドルは上半身の傾きに対応します。腰にはハンドルがなく、体全体の向きはキャラクターパネルの
Yawか、骨盤そのもののドラッグで変えます。

回転は常に画面に対して自然な向きに入ります。画面の奥行き方向へ動かしたいときは、
いったんカメラを回してからドラッグしてください。

### 3D ビュー操作

- 左ドラッグ: カメラ回転（ポーズ操作モードではマネキン上のみ関節回転）/ 右ドラッグ: 移動 / ホイール: ズーム
- マネキンの部位をクリックするとそのボーンが選択され、右パネルに回転スライダーが表示されます
- 何もない場所をクリックすると選択解除
- ハンドルや選択中のハイライトは書き出したPNGには含まれません

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

- 16 ボーンの X/Y/Z 回転（スライダー + 数値入力、またはビュー上のドラッグ）
- キャラクターの位置 (X/Y/Z) と向き (Yaw)、マネキンの色（背景とのコントラスト調整用）
- カメラプリセット: 正面 / 背面 / 左側面 / 右側面 / ハイアングル / ローアングル / 斜め前
- 画角 (FOV)、オービット（水平 / 上下 / 距離）、位置 / 注視点の数値指定
- アスペクト比: 1:1 / 16:9 / 9:16 / 4:3 / 3:4（1024px 基準、2048px も選択可）
- 背景: 白 / グレー / 黒 / 透過、床グリッドと接地影の ON/OFF
- PNG 書き出し（UI・選択ハイライトを含まない 3D ビューのみ）、画像のクリップボードコピー
- プロンプト生成（日本語 / English の切り替え、構図情報の自動追記 ON/OFF）
  見出しをクリックすると折りたためます。畳んでいる間も言語切り替えとコピーは使え、
  その分3Dビューが縦に広がります。
- すべてリセット（ポーズ・キャラクター・カメラ・画角・アスペクト比を初期化）
- 元に戻す（Ctrl+Z）: AI による変更・プリセット・リセットを 1 つずつ取り消します。
  スライダーやドラッグでの調整は取り消しの対象になりません。

## ディレクトリ構成

```
server/        PoseRef サーバー（npm start の入口、MCP ツール、ブラウザとの中継、Vite 用プラグイン）
src/
  agent/       サーバーとの WebSocket 接続と、やり取りするメッセージの型
  components/
    layout/    Header, Sidebar
    panels/    Pose / Character / Camera / AspectRatio / Background / Export / Prompt
    ui/        Button, SliderField, NumberInput, SegmentedControl, Section, Toggle, VectorFields
    viewport/  Viewport, SceneCanvas, CameraRig, Mannequin, BoneHandle, Ground, Lights,
               SceneBackground, ExportBridge
  constants/   bones（ボーン階層・マネキン形状）, posePresets, cameraPresets, aspectRatios, backgrounds,
               prompts, uiText（UI 文言）
  hooks/       useFitAspect, useExport, useCopyText, usePoseDrag（ビュー上のドラッグ操作）, useUndoShortcut
  store/       Zustand ストア（slices: character / pose / camera / view / export / agent）
  types/       共通型定義
  utils/       math, rotation, exportPng, reviewRender（AI 確認用の複数視点描画）, composition, promptBuilder,
               clipboard, download
```

ドラッグ用ハンドルの位置と大きさは `src/constants/bones.ts` の `BONE_HANDLES` で調整します。
半径は必ずその関節まわりの体より大きくしてください。体に埋まったハンドルは見えず、クリックもできません。

`server/` は Node がビルドなしで直接実行します。サーバーから読み込む `src/` のファイル（`constants/` の一部、
`utils/math.ts`、`agent/protocol.ts`）では、実行時に必要な import に `.ts` 拡張子を付け、型以外の import を増やさないでください。

UI の文言は `src/constants/uiText.ts` に集約しています。ポーズを追加する場合は
`src/constants/posePresets.ts` にプリセットを追記し、`src/types/index.ts` の `PosePresetId` に ID を加えます。

## マネキンについて

外部モデルには依存せず、カプセル・楕円体プリミティブを階層化してコードで生成しています。
頭部には向きを判別するためのごく小さな鼻の膨らみのみを付けています（`src/constants/bones.ts` の
`MANNEQUIN_PARTS` で調整・削除できます）。

座標系: キャラクターは +Z を向き、+X がキャラクターの左側です。
四肢はローカル -Y 方向に伸びるため、腕・脚は X 回転がマイナスで前方へ振り上がります。

## ライセンス

[MIT](LICENSE)
