# Design Observability Design (Web Chat -> Preview)

## Goal
3Dモデル生成の1回分を、`designId`で横断追跡できる状態にする。

- Webでプロンプト送信してからpreview表示まで、どこで失敗したかを即判定できる
- API / worker / ai-agent / three-runtime で同じ相関キーを使う
- 原因を機械的に分類できる（`errorStage`, `errorCode`）

## Scope
対象フロー:

1. Web Chat送信
2. `POST /designs` (API)
3. Cloud Tasks enqueue
4. Worker `POST /internal/designs/:designId/run`
5. ai-agent invoke
6. three-runtime execute（ai-agent内ツール実行含む）
7. API側ファイル保存・asset状態更新
8. Web側 polling + preview読込

## As-Is Findings
### 現状の実装事実
- Webは送信後に`designId`でポーリングする
  - `web/features/studio/components/chat-panel.tsx:380`
  - `web/features/studio/components/chat-panel.tsx:171`
- 生成完了後に`fileId`でassetポーリングし、previewを読込む
  - `web/features/studio/hooks/use-file-assets.ts:5`
  - `web/features/studio/components/viewer-panel.tsx:114`
- APIは`requestId`を毎リクエストで採番するが、生成全体のtrace IDはない
  - `api/src/app.ts:44`
- Worker側も別の`requestId`を採番し直す
  - `api/src/worker-app.ts:11`
- Design処理は`design_finished`を出すが、途中段階イベントが不足
  - `api/src/usecases/designs.usecase.ts:420`
- Cloud Tasksには`X-Design-Id`ヘッダがある
  - `api/src/infra/design-task-queue.ts:58`
- ai-agent呼び出し時、APIから`designId`を伝播している
  - `api/src/repositories/ai/design.repository.ai-agent.ts:49`
- 監視は`design_finished`中心で段階別は未整備
  - `infrastructure/terraform/dev/monitoring.tf:1`

### 課題
1. サービスを跨ぐ相関キーが欠落している
2. 失敗段階の規格化がない（どこで落ちたかを機械判定しづらい）
3. preview失敗（asset取得失敗）の観測が薄い
4. `design_finished`だけでは根本原因に辿りづらい

## Target Design
## 1. Correlation Model
`designId`を主相関キーとして全サービスで必須化する。

共通フィールド:
- `design_id`: 既存`DesignJob.id`
- `trace_id`: 原則`design_id`を再利用（追加UUID不要）
- `request_id`: 各HTTP hop固有（既存）
- `service`: `web|api|worker|ai-agent|three-runtime`
- `stage`: 下記Stage Taxonomy
- `event`: `start|success|failure|summary`

補助フィールド:
- `attempt`: retry回数
- `elapsed_ms`
- `error_code`, `error_type`, `error_message`
- `http_status`（外部呼び出し時）

## 2. Stage Taxonomy
標準段階を定義する。

- `WEB_SUBMIT`
- `API_ENQUEUE_VALIDATE`
- `API_TASK_ENQUEUE`
- `WORKER_CLAIM`
- `AI_AGENT_INVOKE`
- `AI_AGENT_AUTO_EXECUTE`（ai-agent内のthree-runtime実行）
- `THREE_RUNTIME_EXECUTE`
- `ASSET_PERSIST_TS`
- `ASSET_PERSIST_GLB`
- `DESIGN_FINALIZE`
- `WEB_PREVIEW_POLL`
- `WEB_PREVIEW_FETCH`

## 3. Error Taxonomy
`error_code`は固定語彙にする。

- `PROJECT_NOT_FOUND`
- `MENTION_FILE_NOT_FOUND`
- `QUOTA_EXCEEDED`
- `TASK_ENQUEUE_FAILED`
- `DESIGN_NOT_FOUND`
- `DESIGN_CLAIM_LOST`
- `AI_AGENT_HTTP_ERROR`
- `AI_AGENT_TIMEOUT`
- `AI_AGENT_EMPTY_CODE`
- `AI_AGENT_INVALID_TITLE`
- `THREE_RUNTIME_HTTP_ERROR`
- `THREE_RUNTIME_EXECUTION_ERROR`
- `ASSET_TOO_LARGE`
- `ASSET_UPLOAD_FAILED`
- `ASSET_NOT_FOUND`
- `PREVIEW_FETCH_HTTP_ERROR`
- `DESIGN_TIMEOUT_RUNNING`
- `DESIGN_TIMEOUT_QUEUED`

## 4. Propagation Rules
### Web -> API
- `X-Trace-Id` をWebで生成して送信
- APIはレスポンスヘッダで `X-Request-Id` を返す

### API -> Cloud Tasks -> Worker
- 既存`X-Design-Id`を必須利用
- `X-Trace-Id`（=`designId`）追加
- `X-Origin-Request-Id`追加

### Worker/API -> ai-agent
- HTTPヘッダに `X-Design-Id`, `X-Trace-Id` を追加
- Bodyにも `designId`, `traceId` を追加

### ai-agent -> three-runtime
- `execute_three` ツール呼び出しで同ヘッダを伝播

### API -> three-runtime（最終実行）
- `X-Design-Id`, `X-Trace-Id`, `X-Request-Id` を付与

## 5. Log Schema (JSON)
全サービスで以下キーを最低限揃える。

- `ts`
- `level`
- `service`
- `event`
- `design_id`
- `trace_id`
- `request_id`
- `stage`
- `status` (`start|success|failure`)
- `elapsed_ms` (end系)
- `error_code` (failure時)
- `error_message` (failure時, truncate)

## 6. API Data Model Extension (推奨)
`DesignJob`に以下追加:

- `errorStage String?`
- `errorCode String?`

理由:
- `/designs/:id` だけで失敗箇所をUIに返せる
- ログが欠けても最低限の説明可能

## 7. Event Emission Design
`DesignsUsecase.process`で段階イベントを明示的に出す。

例:
- `design_stage_start` (`stage=AI_AGENT_INVOKE`)
- `design_stage_success`
- `design_stage_failure` (`error_code`付き)
- `design_trace_summary`（最後に必ず1回）

`design_trace_summary`に含める:
- `design_id`
- `final_status`
- `failed_stage`
- `error_code`
- `total_elapsed_ms`
- `stage_durations`

## 8. Root Cause Detection Rule
1回の生成の原因判定ロジック:

1. `design_id`で全ログを抽出
2. `design_trace_summary`があればそれを正とする
3. なければ`design_stage_failure`の最後の1件を原因とする
4. どちらもなければ`design_finished(status=failed)`を暫定原因にする

## 9. Cloud Logging Queries
### 単一生成の全ログ
```text
resource.type="cloud_run_revision"
jsonPayload.design_id="<DESIGN_ID>"
```

### 失敗段階だけ
```text
resource.type="cloud_run_revision"
jsonPayload.design_id="<DESIGN_ID>"
jsonPayload.status="failure"
```

### ai-agent起因の失敗
```text
resource.type="cloud_run_revision"
jsonPayload.error_code=("AI_AGENT_HTTP_ERROR" OR "AI_AGENT_TIMEOUT" OR "AI_AGENT_EMPTY_CODE")
```

## 10. Monitoring / Alerting Extension
既存メトリクス（`design_finished`）に追加:

- `design_stage_failed_total`（`error_code`, `stage`ラベル）
- `ai_agent_invoke_duration_ms`
- `three_runtime_execute_duration_ms`
- `preview_fetch_failed_total`（必要ならWeb telemetry経由）

アラート:
- `THREE_RUNTIME_EXECUTION_ERROR`急増
- `AI_AGENT_TIMEOUT`急増
- `ASSET_PERSIST_GLB` failure率上昇

## 11. Rollout Plan
### Phase 1 (最小)
- ヘッダ伝播 (`X-Design-Id`, `X-Trace-Id`)
- 段階ログ追加（DB変更なし）
- Cloud Loggingクエリで根因判定可能化

### Phase 2
- `DesignJob.errorStage/errorCode`追加
- `/designs/:id` に `errorStage/errorCode`を返却
- UIで失敗理由を段階別表示

### Phase 3
- ログベースメトリクス/アラート拡張
- ダッシュボード整備

## 12. Acceptance Criteria
- 任意の`designId`で、API/worker/ai-agent/three-runtimeのログが同一キーで結合できる
- 失敗時に`failed_stage`と`error_code`が一意に判定できる
- preview未表示時に、どの段階で止まったかを5分以内に特定できる
- timeout/retry時も`design_trace_summary`が1回だけ残る

## 13. Notes (PII / Security)
- prompt全文・生成コード全文・traceback全文はログに直接載せすぎない（truncate + redaction）
- `error_message`は2KB程度で切る
- Authorizationヘッダはログ出力禁止
