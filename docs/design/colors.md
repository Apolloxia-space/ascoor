# Color System

## Goals
- Studioページのダークテーマで実際に使われている色をトークン化し、再利用しやすくする。
- 新規UIはトークン経由で指定し、ハードコードされたHEXや直接のTailwind色指定を避ける。
- ライトテーマ切り替えに備え、`:root`（light）と`.dark` の両方に同名トークンを定義。

## Tokenレイヤー
### Core / Brand
- `--brand-500` `#da9a9d`（主役のくすみピンク）
- `--brand-600` `#c68689`（濃度違い）
- `--accent-amber` `#da9a9d` / `--accent-emerald` `#95a5a6` / `--accent-purple` `#34495e`
- `--success` `#34d399` / `--warning` `#fcd34d` / `--danger` `#ef4444`
- 透明度が必要な場合は `--brand-500-60`（`#da9a9d99`）を使う

### Background layers (semantic)
- `--background-base` ページのベース背景（light: `#f4f4f4`）
- `--background-panel` メインパネル/大きめカード（light: `#ffffff`）
- `--background-popover` 浮きパネル（light: `#f0f0f0`）
- `--background-input` 入力欄（light: `#ededed` / dark: `#2c353e`）
- `--background-muted` セカンダリ/控えめブロック（light: `#e9e9e9`）
- `--background-highlight` 選択状態カード（light: `#e3e3e3`）
- `--background-active` アクティブタブ/強調セクション（light: `#dddddd`）

### Border & Text
- `--border-subtle` / `--border-strong`（light strong: `#95a5a6`）
- `--text-primary` / `--text-secondary` / `--text-muted`
- `--text-on-brand`

### Effects
- `--overlay`  モーダル用オーバーレイ
- `--glass`    ガラス風背景アルファ
- `--shadow-accent-strong`  `0 0 0 1px rgba(52, 73, 94, 0.55)`
- `--shadow-card-active`    `0 0 0 1px rgba(52, 73, 94, 0.6), 0 0 25px -12px rgba(218, 154, 157, 0.6)`
- `--focus-ring`（light: `#c7ccd1`, dark: `#5c6670`）

### Semantic accents & status
- `--accent-emphasis`（UI上の主アクセント、`--brand-500` を参照）
- `--status-success` / `--status-warning` / `--status-danger`
- `--shadow-focus` / `--shadow-active`

### レガシー互換
`--background`, `--foreground`, `--primary` など既存トークンは残し、内部で上記トークンと整合するよう設定済み。
`--input` は `--background-input` を参照。

## 使用ルール
- 原則、色指定はカスタムプロパティ経由で行う。
- 背景: `bg-[var(--background-panel)]`, `bg-[var(--background-popover)]`
  - 枠線: `border-[var(--border-strong)]`
  - テキスト: `text-[color:var(--text-secondary)]`
  - フォーカス/リング: `focus-visible:ring-[var(--brand-500)]`
- 透明度が必要な場合は用意済みの `--brand-500-60` を使用（例: `border-[var(--brand-500-60)]`）。
- グラデ・影もトークンを優先（例: `shadow-[var(--shadow-card-active)]`）。
- 新規でHEX/Tailwind固定色を使わない。既存コードを触るときはトークンに置き換えてから修正する。
- ライト/ダーク両テーマで意味が通るトークンを選ぶこと（bg- / text- / border- / brand- のセット内で完結させる）。

## サンプル
```tsx
// Popover
<PopoverContent className="bg-[var(--background-popover)] border-[var(--border-strong)] text-[color:var(--text-primary)]" />

// Active tab
<TabsTrigger className="data-[state=active]:bg-[var(--background-active)] focus-visible:ring-[var(--brand-500)]" />

// Card selection state
<div className="border-[var(--brand-500)] bg-[var(--background-highlight)] shadow-[var(--shadow-card-active)]" />
```

## 運用
- トークン定義: `web/app/globals.css` の `:root` / `.dark` を更新。
- 追加色が必要な場合は「Core→Background/Text/Border」のどこに属するかを決め、命名を揃える。
- 既存コンポーネントで色を触るときは、このドキュメントに従いトークン置換を先に行う。
