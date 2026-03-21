# Web Application

Next.js App Router を利用した最小構成のアプリケーションです。`Hello World` ページのみを表示します。

## ディレクトリ構成

```
web/
├─ app/          # Next.js ルーティング・レイアウト層
├─ features/     # 機能ごとの UI・hooks・services を閉じ込める領域
├─ shared/       # 共通 UI/Hooks/Utils/Styles/Constants
└─ public/       # 静的アセット
```

役割の目安:
- 新しいビジネス機能は `features/<domain>` 配下にまとめ、`app/` から組み込む
- 2 箇所以上で使うコンポーネントやロジックは `shared/` へ移動
- API クライアントやアプリ全体の Provider・設定類は `shared/` / `app/` で集中管理

## 必要条件

- Node.js 22 以上
- npm 10 以上

## セットアップ

```bash
npm install
```

## 開発サーバー

```bash
npm run dev
```

http://localhost:3000 で `Hello World` が表示されます。

## ビルド

```bash
npm run build
```

## Docker

```bash
docker build -t ascoor-web:dev -f web/Dockerfile .
docker run --rm -p 3000:3000 --env-file ./web/.env.development ascoor-web:dev
```

Next.js の `output: 'standalone'` を利用しているため、本番イメージは `.next/standalone` の最小構成で起動します。

`web/.env.development` と `web/.env.production` を用途別に使い分けます（Docker ビルド時に `APP_ENV` を必ず指定します）。

## 型チェック

```bash
npm run typecheck
```

## OpenAPI クライアントの自動生成

`openapi/openapi.yaml` を更新したら、React Query クライアントを再生成します。

```bash
npm run generate
```

これにより `shared/api/generated/` 以下に TypeScript の `fetcher`, `schemas`, React Query フックが作成されます。`shared/api/fetcher.ts` で API ベース URL やフェッチ戦略をカスタマイズできます。
