# three.js 3Dモデル生成 移行計画

## Decision
- 決定日: 2026-02-27
- 3Dモデル生成の実行基盤を旧Pythonモデリング基盤から three.js(TypeScript/JavaScript) に切り替える。
- 後方互換性は提供しない。
- 移行期間中のデュアル運用は行わない。

## Target Architecture
- 生成コード: TypeScript/JavaScript + `three`
- 実行ランタイム: Node.js（`ai-agents` もしくは専用ランタイムサービス）
- 主要出力: `GLB`（プレビュー用）と `TS`（編集可能ソース）
- API契約: 生成対象は three.js コードであることを明示

## Out of Scope
- 旧Pythonモデリングコードの自動変換
- Python実行経路の維持
- 旧エラーコード/旧レスポンス構造との互換

## Implementation Plan
1. 仕様固定
- OpenAPI と内部DTOで「生成コード = three.js」を定義
- エラー語彙を three.js 実行基盤に合わせて更新

2. AI生成層の切替
- `ai-agents` の system prompt / validation を three.js 前提へ変更
- 旧Python import 前提の補正ロジックを削除
- 出力検証を `THREE.*` / `three` import 検査へ置換

3. 実行層の置換
- Python legacy CAD bot 依存を削除
- three.js 実行ランタイムを実装し、`GLB` 出力を標準化
- タイムアウト・メモリ制限・ログ制限を Node 実行に合わせて実装

4. API/Worker統合
- 生成パイプラインの実行先を three.js ランタイムに差し替え
- ステータス/失敗理由を新エラーコードへ統一
- 生成完了時の保存対象を `TS + GLB` に統一

5. Web統合
- コード表示を TypeScript 前提に変更
- プレビュー入力を `GLB` 優先に統一
- UI文言から旧Pythonモデリング基盤前提を削除

6. テスト刷新
- Python/旧モデリング基盤前提のテストを削除
- three.js 生成・実行・保存の E2E を新設
- 失敗系（構文エラー、実行タイムアウト、空モデル）を追加

7. 廃止作業
- legacy CAD bot 関連コード・設定・CIジョブ・Terraform参照を削除
- 変数名 `CQ_*` を用途に沿って `THREE_*` / `MODEL_*` へ改名

## Done Criteria
- 本番生成で旧Pythonモデリング実行経路が 0 件
- 生成成功時に three.js ソースと GLB が保存される
- 生成失敗時に `errorStage/errorCode` で失敗原因を一意に判定できる
- リポジトリ内ドキュメントに旧Pythonモデリング基盤を現行仕様として記載しない

## Task Breakdown (Initial Tickets)
1. OpenAPI と生成DTOの three.js 化
2. ai-agents のプロンプト/バリデーション更新
3. three.js 実行ランタイム実装
4. API worker から新ランタイム呼び出し
5. Web のコードパネル文言・ハイライト設定更新
6. 旧 legacy CAD bot 依存の削除
7. 監視メトリクス/ログ語彙の更新
