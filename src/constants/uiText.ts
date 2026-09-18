/**
 * User-facing UI strings (Japanese), kept in one place so wording can be tuned
 * without touching component logic. Technical terms (FOV, Yaw, PNG...) stay in English.
 */
export const UI = {
  app: {
    tagline: '画像生成AI向け 構図・ポーズ参考画像メーカー',
    resetAll: 'すべてリセット',
    resetAllTitle: 'ポーズ・キャラクター・カメラ・画角・アスペクト比を初期状態に戻します',
    rendering: 'レンダリング中...',
  },
  common: {
    reset: 'リセット',
    custom: 'カスタム',
    left: '左',
    right: '右',
    resetOf: (label: string) => `${label}をリセット`,
    valueOf: (label: string) => `${label}の値`,
  },
  viewport: {
    output: '出力',
    hint: '左ドラッグ: 回転 ／ 右ドラッグ: 移動 ／ ホイール: ズーム ／ モデルをクリックでボーン選択',
  },
  pose: {
    title: 'ポーズ',
    preset: 'プリセット',
    bone: 'ボーン',
    rotationOf: (bone: string) => `${bone}の回転`,
    axisRotation: (axis: string) => `${axis} 回転`,
    selectHint: '上のボタン、または3Dビューでモデルの部位をクリックしてボーンを選ぶと、回転を編集できます。',
  },
  character: {
    title: 'キャラクター',
    position: '位置',
    rotation: '回転',
    yaw: '向き (Yaw)',
    color: 'マネキンの色',
    colorOf: (name: string) => `マネキンの色: ${name}`,
  },
  camera: {
    title: 'カメラ',
    preset: 'プリセット',
    fov: '画角 (FOV)',
    orbit: 'オービット（注視点を中心に回転）',
    yaw: '水平 (Yaw)',
    pitch: '上下 (Pitch)',
    distance: '距離',
    numeric: '位置 / 注視点を数値で指定',
    position: '位置',
    lookAt: '注視点',
  },
  aspect: {
    title: 'アスペクト比',
    exportSize: (width: number, height: number) => `出力サイズ: ${width} × ${height} px`,
  },
  background: {
    title: '背景',
    grid: '床グリッド',
    shadow: '接地影',
  },
  export: {
    title: '書き出し',
    baseSize: '基準サイズ',
    hint: (width: number, height: number, background: string) =>
      `PNG ${width} × ${height} px、背景: ${background}。UIや選択ハイライトは含まれず、3Dビューのみ書き出されます。`,
    exportPng: 'PNGを書き出す',
    copyImage: '画像をクリップボードにコピー',
    rendering: 'レンダリング中...',
    renderingHint: '現在のビューをレンダリングしています...',
    saved: 'PNGを保存しました',
    copied: '画像をクリップボードにコピーしました',
    notReady: '3Dビューの準備ができていません',
    failed: '書き出しに失敗しました',
    encodeFailed: 'PNGのエンコードに失敗しました',
    canvasUnavailable: '2Dキャンバスを作成できません',
    imageClipboardUnsupported: 'このブラウザは画像のクリップボードコピーに対応していません',
    clipboardFailed: 'クリップボードへのコピーに失敗しました',
  },
  prompt: {
    title: 'AIプロンプト生成',
    description:
      '書き出したPNGと一緒に画像生成AIへ渡すプロンプトです。ポーズと構図だけを参照させ、マネキンのデザインは反映させません。',
    appendDetails: '構図情報を追記',
    copied: 'コピーしました',
    copyFailed: 'コピーに失敗しました',
    textareaOf: (language: string) => `${language}プロンプト`,
  },
} as const
