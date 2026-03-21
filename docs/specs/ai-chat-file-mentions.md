# AI Chat File Mentions

この仕様は `docs/specs/ai-chat-spec.md` に統合済みです。

## 最新仕様の参照
- `docs/specs/ai-chat-spec.md`

## 要点（最新）
- メンションは `@` で追加し、最大N件まで
- Python資産のないファイルはエラー
- プロンプトには `<file>` ブロックで埋め込む
- Auto Orchestration は design のみ使用
