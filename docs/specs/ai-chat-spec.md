# AI Chat Spec (Input-Only, three.js)

## Summary
AI Chatは「会話UI」ではなく、three.jsベースの3Dモデル生成のための**入力欄のみ**を提供する。チャット履歴やAIメッセージ一覧は表示しない。ファイルメンションは維持し、生成成功時は作成ファイルを開く。

## Goals
- 入力欄のみでthree.jsによる3Dモデル生成を実行できる
- ファイルメンションを安全にプロンプトへ埋め込む
- 生成成功時にファイルを開き、失敗時に明確なエラーを出す

## Non-goals
- チャット履歴表示
- Chat/Generateのモード切替
- 会話ベースのQ&A体験
- 既存ファイルの直接編集や差分管理
- 画像/スケッチ添付
- リアルタイム共同編集

## UX
- 入力欄は単一。
- `@`でファイルメンションを追加できる。
- メンションはピル表示で削除可能。
- 送信中はスピナーを表示する。
- 生成成功時は該当ファイルを開く。
- 生成失敗時はトーストでエラーを表示する。

## Auto Orchestration（LangGraph）
- **design のみ**使用する。
- APIは `operation: design` を使用する。
- chat判定は行わない。

## File Mentions
### 仕様
- 最大N件まで（デフォルト3）
- TypeScript/JavaScript資産がないファイルは弾く
- 1ファイルあたり最大文字数、合計最大文字数を超える場合はトリム

### プロンプト埋め込み形式
```
User request:
{user_prompt}

Context files (for reference or modification):
<file id="{fileId}" name="{displayName}">
```ts
{file_content}
```
</file>
```

## Backend Behavior
- `/designs` の処理内で、AIエージェントの `/design` を呼び出してコード生成する。
- AIの応答がthree.jsコードを含まない場合は失敗扱いとする。

## Data Model / API
- `ChatMessage.mentionedFileIds: string[]` を保持する
- `CreateDesignRequest` に `mentionedFileIds` を許可

## Limits / Config
- `AI_AGENT_MAX_MENTION_FILES` (default 3)
- `AI_AGENT_MAX_MENTION_CHARS` (default 20000)
- `AI_AGENT_MAX_MENTION_TOTAL_CHARS` (default 50000)

## Error Handling
- file not found: 404
- file has no TypeScript/JavaScript content: 400
- too many mentioned files: 400
- AI agent failure: design failed

## Acceptance Criteria
- 入力欄から送信するとthree.jsによる3Dモデル生成が走る
- 生成成功時に新規ファイルが作成され、表示される
- メッセージ一覧は表示しない
- メンションは保持され、送信時にプロンプトへ含まれる
