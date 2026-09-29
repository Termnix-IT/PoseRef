# PoseRef

画像生成AIへ渡す「構図・ポーズ参考画像」をブラウザ上で素早く作るための Web アプリです。
顔・髪・衣装を持たない単色マネキンのポーズとカメラ構図を調整し、3D ビューを PNG として書き出し、
参考画像用のプロンプト（日本語 / 英語）をコピーできます。UI は日本語です。
MCP に対応した AI エージェント（Claude Code / Codex）から、文章の指示でポーズとカメラを作らせることもできます。

## 使い方

Node.js 22.18 以上が必要です。AI エージェントから使う場合は、Claude Code か Codex も入れておいてください。

### 導入（最初の 1 回だけ）

```bash
npx poseref setup
```

見つかった Claude Code と Codex に PoseRef を登録します。実行する前に、何を登録し、どのファイルを書き換えるかを表示して確認を求めます。
確認を省く場合は `--yes`、表示だけして何も変えない場合は `--dry-run` を付けます。
終わったら Claude Code / Codex を起動し直し、「PoseRef で、椅子に座って頬杖をつくポーズを斜め前から撮って」のように頼んでください。
エージェントが最初に PoseRef のツールを使ったときに、PoseRef が起動してブラウザで画面が開きます。
3D の描画はブラウザで行うので、このタブは開いたままにしてください。ヘッダーに「AI連携: 接続中」と表示されていれば準備できています。
タブを閉じてしまっても、次にツールを使ったときに開き直します（ユーザーがわざと閉じた直後に何度も開かないよう、自動で開くのは 60 秒に 1 回までです）。
「PoseRef を開いて」と頼むと、エージェントが `open_poseref` で画面を開きます。すでにタブが開いていれば、新しいタブは増やしません。

登録するコマンドはバージョンを固定しています（`npx -y poseref@<バージョン> mcp`）。新しい版が公開されても、知らないうちに別のコードが動くことはありません。
更新するときは `npx poseref@latest setup` を実行し直してください。

### エージェントなしで使う

```bash
npx poseref        # PoseRef を起動してブラウザで開く
npx poseref stop   # 起動中の PoseRef を止める
```

画面だけでもポーズ作り・PNG 書き出し・プロンプトのコピーができます。

### 設定

| 環境変数 | 内容 |
| --- | --- |
| `POSEREF_PORT` | 使うポート（既定は 47173）。`npx poseref setup` のときに指定すると、エージェントの登録にも引き継がれます |
| `POSEREF_NO_OPEN` | 値を入れると、ブラウザを自動で開きません |

### Claude Code と Codex の確認

Codex は、読み取り専用ではない MCP ツールを呼ぶたびに承認を求めます。`set_scene` と `reach` は PoseRef の画面だけを変え、
「元に戻す」で取り消せる操作で、`open_poseref` は PoseRef の画面を開くだけの操作です。そのため `npx poseref setup` は、この 3 つを承認なしで実行する設定を
`~/.codex/config.toml` に追記します。
追記の前に同じ場所へバックアップを作り、Codex が設定を読めなくなった場合は元に戻します。
この設定がないと、ポーズを直すたびに承認することになり、`codex exec` のような非対話の実行では `set_scene` がキャンセルされます。

Claude Code もツールを呼ぶたびに許可を求めることがあります。毎回の確認を省く場合は、`~/.claude/settings.json` の
`permissions.allow` に `"mcp__poseref"` を加えると、PoseRef のツールすべてが許可されます（セットアップはここを変えません）。

### エージェントが使うツール

| ツール | 内容 |
| --- | --- |
| `open_poseref` | PoseRef が止まっていれば起動し、ブラウザで画面を開く。タブがすでに開いていれば何もしない |
| `get_pose_spec` | ボーンの軸と符号の決まり、接地、カメラ、プリセットの実例をまとめた説明書を返す。内容はコードの定数から生成される |
| `get_scene` | 現在のポーズ・キャラクターの向きと位置・カメラ・アスペクト比を JSON で返す |
| `set_scene` | ポーズ・キャラクター・カメラ・アスペクト比を適用する。ポーズを指定したときは、体の最下点が床にちょうど着くよう腰の高さを自動で合わせる（ジャンプなどは `pose.ground: false` で無効にできる）。未知のボーン名や範囲外の値は、何も適用せずにエラーを返す |
| `render_views` | 現在のカメラ・正面・側面・真上などを 1 枚の PNG に並べて返す。同じ画像を `~/.poseref/renders` にも保存し、そのパスを返す |
| `reach` | 逆運動学（IK）。「右肘を右膝の上へ」「左手のひらを腰へ」のように、関節の目印を別の目印や座標へ動かすよう骨を回す。肘と膝は自然な方向にだけ曲がり、胸・首・頭は可動域の範囲内に収める。届かなかった目標は残りの距離とともに返す |
| `get_joint_positions` | 肘・手のひら・膝・足裏・顎などの位置（メートル）と、体の最下点の高さを返す。指定した 2 点の距離も計算し、手が顎に触れているか、足が床に着いているかを数値で確かめるのに使う |

エージェントは `set_scene` と `render_views` を繰り返し、描画結果を見ながらポーズを直します。
仕上がりは「大まかに合っている」程度を想定しているので、細部は手で調整してください。
AI による変更は、ヘッダーの「元に戻す」（または Ctrl+Z）で 1 回ずつ取り消せます。
`render_views` が画像をファイルにも保存するのは、MCP の画像をモデルに渡せないクライアントでも、
エージェントがそのファイルを開いて確認できるようにするためです。
PoseRef のタブを複数開いている場合は、最後に操作したタブが対象になります。

### 仕組みとセキュリティ

エージェントが起動する `npx poseref mcp` は、エージェントとは標準入出力（stdio）で MCP をやり取りします。
ブラウザへの指示だけを、バックグラウンドで動く PoseRef サーバー（`http://127.0.0.1:47173`）に送ります。
サーバーはエージェントのセッションが終わっても動き続けるので、別のセッションからも同じタブを使えます。

- サーバーは `127.0.0.1` でのみ待ち受け、同じ PC の外からは接続できません。`Host` と `Origin` を確かめ、ほかの Web サイトからの操作を拒否します。
- `~/.poseref/secret` に、利用者ごとの秘密鍵を本人だけが読める権限で作ります。`poseref mcp` は、ポートにいる相手がこの鍵を持つ PoseRef であることを確かめてから通信し、別のプログラムがポートを使っていた場合は何も送りません。サーバーの内部用の受け口（`/poseref/*`）は、この鍵がないと使えません。
- `render_views` の画像は `~/.poseref/renders` に最新 20 枚まで残します。
- npm パッケージには、ビルド済みの画面（`dist/`）とサーバー（`dist-server/`）だけが入っています。インストール時に実行されるスクリプトはありません。

### アンインストール

```bash
npx poseref stop
claude mcp remove poseref --scope user
codex mcp remove poseref
```

最後に、必要なら `~/.poseref` フォルダを削除してください。
`codex mcp remove` で承認設定が残った場合は、`~/.codex/config.toml` の `[mcp_servers.poseref.tools.*]` の行を消してください。

## 開発

```bash
git clone https://github.com/Termnix-IT/PoseRef.git
cd PoseRef
npm install
npm run dev
```

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | Vite 開発サーバー（`http://localhost:5173`）。MCP の HTTP エンドポイントも 47173 番で同時に起動する |
| `npm run build` | 型チェック、画面のビルド（`dist/`）、サーバーのビルド（`dist-server/cli.js`） |
| `npm start` | ビルドしてから、公開版と同じ `dist-server/cli.js` で PoseRef を起動する |
| `npm test` | IK・体の位置の計算・認証・内部用の受け口・セットアップのテスト（ブラウザ不要） |
| `npm run typecheck` | 型チェックのみ |
| `npm run preview` | ビルド結果のプレビュー（AI 連携なし） |

`npm run dev` と `npm start`、エージェントが起動した PoseRef は、同じ 47173 番を使います。開発を始める前に `npx poseref stop` で止めてください。

開発中は、エージェントを MCP の HTTP エンドポイントで登録すると、ビルドせずに試せます。
リポジトリの `.mcp.json` に登録を入れてあるので、このリポジトリの中で Claude Code を起動すればそのまま使えます（初回に使用を許可するかどうかを聞かれます）。
ほかの場所から使う場合は次のように登録します。

```bash
claude mcp add --transport http --scope user poseref-dev http://127.0.0.1:47173/mcp
```

Codex の場合は `~/.codex/config.toml` に次を追記します。

```toml
[mcp_servers.poseref-dev]
url = "http://127.0.0.1:47173/mcp"

[mcp_servers.poseref-dev.tools.set_scene]
approval_mode = "approve"

[mcp_servers.poseref-dev.tools.reach]
approval_mode = "approve"

[mcp_servers.poseref-dev.tools.open_poseref]
approval_mode = "approve"
```

npm への公開は `npm publish` で行います。`prepublishOnly` でビルドとテストが走ります。
公開する中身は、事前に `npm pack --dry-run` で確かめられます。

## 技術スタック

- React 19 / TypeScript / Vite
- Three.js / React Three Fiber / @react-three/drei
- Zustand（状態管理）
- Node.js サーバー（`server/`）: `poseref` コマンド、MCP サーバー、ブラウザへの中継。MCP SDK v2 / ws / zod

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
server/        `poseref` コマンド（cli.ts）、PoseRef サーバー、MCP ツール、ブラウザとの中継、認証、セットアップ、Vite 用プラグイン
test/          node:test のテスト（npm test）
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

`server/` と `test/` は、開発中は Node がビルドなしで直接実行し、公開用には `npm run build:server` で `dist-server/cli.js` にまとめます。
サーバーとテストから読み込む `src/` のファイル（`constants/` の一部、`utils/math.ts`・`ik.ts`・`jointPositions.ts`・`rotation.ts`、
`agent/protocol.ts`）では、実行時に必要な import に `.ts` 拡張子を付け、ブラウザ専用のモジュールを import しないでください。

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
