# ascoor API (Hono + Prisma)

シンプルな層分けで運用するため、ドメインごとに以下の4ファイルを基本テンプレートとして追加してください。

```
src/modules/<domain>/
  <domain>.repository.ts          # 永続化インターフェース
  <domain>.repository.prisma.ts   # Prisma実装などインフラ依存
  <domain>.service.ts             # ビジネスロジックと検証
  <domain>.routes.ts              # Honoサブルーター（入出力取り扱いのみ）
```

## 既存サンプルに沿った実装手順
1. リポジトリIFを定義：`<domain>.repository.ts`
2. 実装を用意：`<domain>.repository.prisma.ts`（※他データソースでもOK）
3. ドメインサービス：`<domain>.service.ts` にバリデーションとユースケースを集約
4. ルーター：`<domain>.routes.ts` で Hono を使い、入力→サービス呼び出し→レスポンスのみを担当
5. 依存注入：`src/server.ts` の `buildDependencies()` にサービスを組み立て、`createApp` に渡す
6. マウント：`createApp` 内で `app.route('/<domain>', create<Domain>Routes({ <domain>Service }))`

## OpenAPI をソース・オブ・トゥルースにする
- 仕様: `openapi/openapi.yaml`
- コード生成: `npm run generate --prefix api`（[Orval Hono テンプレート](https://orval.dev/guides/hono)）
- 出力: `src/generated/` 配下に Zod スキーマ・コンテキスト (`endpoints/**`)、共通バリデーター (`validator.ts`)、複合ルーター (`routes.ts`)

各 `*.handlers.ts` では Orval が初回のみスタブを生成し、その後は上書きされません。`createFactory<AppEnv>()` と `c.get('sampleService')` を利用してドメインサービスを呼び出し、必要に応じてレスポンス検証 `zValidator('response', ...)` を組み合わせてください。仕様を変更したら `npm run generate --prefix api && npm run generate --prefix web` を実行し、Web 側の React Query クライアントも再生成してください。

## コマンド
- 開発: `npm run dev --prefix api`
- 型チェック: `npm run typecheck --prefix api`
- ビルド: `npm run build --prefix api`

## 環境変数
`src/config/env.ts` が `DB_...` 系の値を読み取り、`src/db/client.ts` で Prisma 接続文字列を生成します。

## エンドポイント
- `GET /` プレースホルダー
- `GET /health` ヘルスチェック
- `GET/POST /samples` サンプルドメイン（テンプレ参考）
