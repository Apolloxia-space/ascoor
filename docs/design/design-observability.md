# Pack Generation Observability

## Goal
1回の asset pack 生成を `packGenerationJobId` で横断追跡し、生成済み asset pack は `assetPackId` で参照する。

## Canonical IDs
- `packGenerationJobId`: 生成ジョブと trace の主キー。API、worker、ai-agent、Cloud Tasks の相関キー。
- `assetPackId`: 生成成功後に作成される asset pack の ID。
- `traceId`: Web で生成する任意の相関 ID。未指定時は `packGenerationJobId` を使う。
- `requestId`: HTTP hop ごとのリクエスト ID。

## Flow
1. Web sends `POST /pack-generation-jobs`.
2. API validates credits and creates `PackGenerationJob`.
3. API enqueues Cloud Tasks with `X-Pack-Generation-Job-Id`.
4. Worker runs `POST /internal/pack-generation-jobs/{packGenerationJobId}/run`.
5. Worker calls ai-agent `/asset-pack-plan` and `/asset-pack`.
6. API persists generated parts and creates/links `AssetPack`.
7. Web polls `/pack-generation-jobs/{packGenerationJobId}` and then loads `/asset-packs/{assetPackId}`.

## Log Fields
- `pack_generation_job_id`
- `asset_pack_id`
- `trace_id`
- `request_id`
- `service`
- `stage`
- `event`
- `status`
- `elapsed_ms`
- `error_code`
- `error_message`

## Stage Taxonomy
- `API_ENQUEUE_VALIDATE`
- `API_TASK_ENQUEUE`
- `WORKER_CLAIM`
- `ASSET_PACK_PLAN`
- `ASSET_PART_GENERATE`
- `ASSET_PERSIST`
- `PACK_GENERATION_FINALIZE`
- `WEB_JOB_POLL`
- `WEB_ASSET_PACK_FETCH`

## Error Taxonomy
- `WORKSPACE_NOT_FOUND`
- `ASSET_PACK_NOT_FOUND`
- `PACK_GENERATION_JOB_NOT_FOUND`
- `QUOTA_EXCEEDED`
- `TASK_ENQUEUE_FAILED`
- `PACK_GENERATION_CLAIM_LOST`
- `AI_AGENT_HTTP_ERROR`
- `AI_AGENT_TIMEOUT`
- `AI_AGENT_EMPTY_CODE`
- `AI_AGENT_INVALID_TITLE`
- `AI_AGENT_ASSET_PACK_FAILED`
- `ASSET_UPLOAD_FAILED`
- `ASSET_NOT_FOUND`
- `PREVIEW_FETCH_HTTP_ERROR`
- `PACK_GENERATION_TIMEOUT_RUNNING`
- `PACK_GENERATION_TIMEOUT_QUEUED`

## Cloud Logging Queries
```text
resource.type="cloud_run_revision"
jsonPayload.pack_generation_job_id="<PACK_GENERATION_JOB_ID>"
```

```text
resource.type="cloud_run_revision"
jsonPayload.pack_generation_job_id="<PACK_GENERATION_JOB_ID>"
jsonPayload.status="failure"
```

## Acceptance Criteria
- 任意の `packGenerationJobId` で API、worker、ai-agent のログを結合できる。
- 成功時は `assetPackId` が `PackGenerationJob` にリンクされる。
- 失敗時は `errorStage` と `errorCode` で原因を一意に判定できる。
- UI は `packGenerationJobId` で生成状態を追跡し、`assetPackId` で成果物を表示する。
