# Ascoor 本番手動テストケース（画面単位）

最終更新: 2026-02-13  
対象: `web`（Next.js フロントエンド）本番環境

## 1. テスト前提

- 対象環境: 本番 URL
- 対象ブラウザ: Chrome 最新版（推奨動作環境）
- テストユーザー:
  - `U1_FREE`: Free プランの通常ユーザー
  - `U2_PRO`: Pro プランの通常ユーザー
  - `U3_NEW`: 初回ログイン直後でプロジェクト未作成ユーザー
- 記録列:
  - `結果`: `OK / NG / N/A`
  - `証跡`: スクリーンショット URL やログ参照先

## 2. 共通チェック観点

- 画面クラッシュ（白画面/無限ローディング）がない
- 文言が意図通り（英語 UI を基準）
- エラー時にトースト/ダイアログで利用者に伝わる
- URL 遷移が期待通り（リダイレクト含む）

## 3. 画面別テストケース

| ID | 画面/URL | 前提 | 手順 | 期待結果 | 優先度 | 結果 | 証跡 |
|---|---|---|---|---|---|---|---|
| LANDING-01 | ランディング `/` | 未ログイン | ページを開く | ヒーロー、Pricing、Footer が表示される | P0 |  |  |
| LANDING-02 | ランディング `/` | 未ログイン | Header の `Solutions` を押す | `#generative-design` セクションへスクロールする | P1 |  |  |
| LANDING-03 | ランディング `/` | 未ログイン | Header の `Pricing` を押す | `#plans` セクションへスクロールする | P1 |  |  |
| LANDING-04 | ランディング `/` | 未ログイン | `Continue with Google` を押して認証完了 | `/studio` に遷移する | P0 |  |  |
| LANDING-05 | ランディング `/` | 未ログイン | `privacy policy` リンク押下 | `/privacy` が開く | P1 |  |  |
| LANDING-06 | ランディング `/` | ログイン済み | Header の `Try Ascoor` を押す | `/studio` に遷移する | P0 |  |  |
| LEG-01 | Terms `/terms` | なし | ページを開く | 規約本文が表示される。`Last updated: 2026-02-12` 表記あり | P1 |  |  |
| LEG-02 | Privacy `/privacy` | なし | ページを開く | プライバシーポリシー本文が表示される。`Last updated: 2026-02-12` 表記あり | P1 |  |  |
| LEG-03 | 商取引法表記 `/commerce-disclosure` | なし | ページを開く | 事業者情報・価格・返金/解約情報が表示される | P1 |  |  |
| STUDIO-01 | 3D Design Studio `/studio` | 未ログイン | `/studio` を直接開く | `/` へリダイレクトされる | P0 |  |  |
| STUDIO-02 | 3D Design Studio `/studio` | `U3_NEW` ログイン | `/studio` を開く | Project List ダイアログが開き、`No projects yet...` 表示 | P0 |  |  |
| PRJ-01 | Project List ダイアログ | `U3_NEW` | `New project` から新規作成 | プロジェクトが作成され選択状態になる。`Project created.` トースト | P0 |  |  |
| PRJ-02 | Project List ダイアログ | 複数プロジェクトあり | 検索入力に部分一致文字列を入力 | 一致プロジェクトのみ表示される | P1 |  |  |
| PRJ-03 | Project List ダイアログ | 既存プロジェクトあり | 対象プロジェクトの `Rename` 実行 | 名前が更新される。`Project name updated.` トースト | P0 |  |  |
| PRJ-04 | Project List ダイアログ | 既存プロジェクトあり | 対象プロジェクトの `Delete` 実行 | プロジェクトが削除される。`Project deleted.` トースト | P0 |  |  |
| PRJ-05 | Header プロジェクトメニュー | 既存プロジェクトあり | `Close Project` 実行 | プロジェクト選択が解除される（Project List 再表示） | P1 |  |  |
| FIL-01 | Files パネル | プロジェクト選択済み | `Create a new file` でファイル作成 | ファイルが作成され選択状態。`File created.` トースト | P0 |  |  |
| FIL-02 | Files パネル | 複数ファイルあり | ファイル行を押下 | 選択ファイルが切り替わる | P0 |  |  |
| FIL-03 | Files パネル | ファイルあり | 右クリック `Rename` 実行 | 名前変更される。`File name updated.` トースト | P0 |  |  |
| FIL-04 | Files パネル | ファイルあり | 右クリック `Delete` 実行 | ファイル削除される。`File deleted.` トースト | P0 |  |  |
| FIL-05 | Files パネル | ファイルあり | 右クリック `Copy file name` 実行 | クリップボードにファイル名がコピーされる | P2 |  |  |
| CH-01 | 3D Design Prompt パネル | プロジェクト未選択 | 送信ボタン状態確認 | 送信ボタンが無効 | P1 |  |  |
| CH-02 | 3D Design Prompt パネル | プロジェクト選択済み | プロンプト入力して送信 | 生成リクエストが送信される（ローディング表示） | P0 |  |  |
| CH-03 | 3D Design Prompt パネル | ファイルあり | `+` からファイル mention 1件追加 | `@filename` バッジ表示。送信時に参照される | P1 |  |  |
| CH-04 | 3D Design Prompt パネル | mention 1件追加済み | 2件目 mention 追加試行 | `File mention limit` ダイアログ表示 | P1 |  |  |
| CH-05 | 3D Design Prompt パネル | Free 上限到達ユーザー | 生成送信 | `Design limit reached` ダイアログ表示。`Upgrade to Pro` が表示される | P0 |  |  |
| CH-06 | 3D Design Prompt パネル | 生成失敗を再現可能 | 失敗する入力で生成 | `Design failed` ダイアログ表示 | P0 |  |  |
| VW-01 | Viewer パネル | ファイル未選択 | 画面中央表示確認 | `Select a file to view the 3D preview.` 表示 | P1 |  |  |
| VW-02 | Viewer パネル | 生成中ファイル選択 | 状態表示確認 | `Fetching rendering results...` など進行中メッセージ表示 | P1 |  |  |
| VW-03 | Viewer パネル | 生成成功ファイル選択 | 3D 表示確認 | GLB が描画される。オーバーレイが消える | P0 |  |  |
| VW-04 | Viewer パネル | 生成失敗ファイル選択 | 状態表示確認 | `Rendering failed.` と詳細表示 | P0 |  |  |
| VW-05 | Viewer パネル | TypeScriptアセットあり（生成成功/失敗）ファイル選択 | Download > `TypeScript` | `.ts` ダウンロード成功。`TypeScript file downloaded.` トースト | P0 |  |  |
| VW-06 | Viewer パネル | 生成成功ファイル選択 | Download > `GLB` | `.glb` ダウンロード成功。`GLB exported.` トースト | P0 |  |  |
| VW-07 | Viewer パネル | ファイル未選択/未生成 | Download メニュー開く | `TypeScript` / `GLB` が無効 | P1 |  |  |
| NAV-01 | 3D Design Studio デスクトップ UI | ログイン済み | 左側 `Projects` アイコンで開閉 | Files パネルが開閉する | P1 |  |  |
| NAV-02 | 3D Design Studio デスクトップ UI | ログイン済み | 右側 `AI Chat` アイコンで開閉 | Chat パネルが開閉する | P1 |  |  |
| NAV-03 | 3D Design Studio モバイル UI | ログイン済み | 上部メニュー `Files` 選択 | 左 Sheet で Files が開く | P1 |  |  |
| NAV-04 | 3D Design Studio モバイル UI | ログイン済み | 上部メニュー `AI Chat` 選択 | 右 Sheet で Chat が開く | P1 |  |  |
| NAV-05 | 3D Design Studio モバイル UI | ログイン済み | 上部メニュー `Settings/Billing/Upgrade` 選択 | 各 URL に遷移する | P1 |  |  |
| PLN-01 | Plans `/plans` | 未ログイン | `/plans` を直接開く | `/` へリダイレクトされる | P0 |  |  |
| PLN-02 | Plans `/plans` | `U1_AUTH` | Pro カード `Upgrade to Pro` | Checkout セッション URL へ遷移する | P0 |  |  |
| PLN-03 | Plans `/plans` | `U2_PRO` | Pro カードボタン押下 | `Manage subscription` として `/settings/billing` に遷移 | P0 |  |  |
| PLN-04 | Plans `/plans?status=cancel` | ログイン済み | URL 直打ち | `Checkout was canceled.` トースト表示 | P1 |  |  |
| PLN-05 | Plans `/plans?status=failed` | ログイン済み | URL 直打ち | `Payment could not be completed` ダイアログ表示 | P1 |  |  |
| PLN-06 | Plans `/plans?status=success` | ログイン済み | URL 直打ち | `/settings/billing` に遷移する | P1 |  |  |
| SET-01 | Settings `/settings` | ログイン済み | `/settings` を開く | `/settings/account` にリダイレクト | P0 |  |  |
| SET-02 | Settings Account | ログイン済み | Username 変更して `Save` | 反映され `Username updated.` トースト | P0 |  |  |
| SET-03 | Settings Account | ログイン済み | Username を空にして `Save` | 保存不可（ボタン disabled もしくはエラー） | P1 |  |  |
| SET-04 | Settings Account | ログイン済み | 編集後 `Cancel` | 表示名入力が元に戻る | P1 |  |  |
| SET-05 | Settings Account | ログイン済み | `Delete account` 実行、確認文字を誤入力 | `Delete` 実行ボタンが無効 | P0 |  |  |
| SET-06 | Settings Account | ログイン済み | `DELETE` 入力して退会実行 | アカウント削除後サインアウトし `/` へ遷移 | P0 |  |  |
| BIL-01 | Settings Billing | `U2_PRO` | Billing タブ表示確認 | Current plan/renewal 日付が表示される | P0 |  |  |
| BIL-02 | Settings Billing | ログイン済み | Usage セクション確認 | 使用量と上限、プログレスバー表示 | P1 |  |  |
| BIL-03 | Settings Billing | ログイン済み | Payment method `Manage` | Stripe Billing Portal に遷移 | P0 |  |  |
| BIL-04 | Settings Billing | ログイン済み | Billing history `View in portal` | Stripe Billing Portal に遷移 | P1 |  |  |
| BIL-05 | Settings Billing | `U2_PRO` | `Cancel` から理由入力し `Cancel plan` | 解約予約が登録される。`Cancellation request received.` トースト | P0 |  |  |
| BIL-06 | Settings Billing | 解約予約済みユーザー | Billing 画面再表示 | `Cancellation scheduled` バッジ表示、`Access ends` 日付表示 | P0 |  |  |
| AUTH-01 | App Header（3D Design Studio/Settings） | ログイン済み | User メニュー > `Sign out` | サインアウトされ、保護画面へ再入場時は `/` に戻る | P0 |  |  |

## 4. 重点シナリオ（リリース判定用）

| シナリオ ID | 手順（要約） | 合格条件 |
|---|---|---|
| E2E-01 | 新規ログイン → プロジェクト作成 → ファイル作成 → 生成成功 → GLB/TypeScript ダウンロード | 一連の導線がエラーなく完了 |
| E2E-02 | Free ユーザーで上限到達 → Upgrade 導線 → Checkout へ遷移 | 上限制御と課金導線が機能 |
| E2E-03 | Pro ユーザーで Billing から解約予約 → 画面再確認 | 解約状態が UI に反映 |
| E2E-04 | Account 削除 | 削除後にセッションが失効し再利用不可 |

## 5. 実施ログテンプレート

| 実施日 | 実施者 | 環境 | 対象 ID 範囲 | NG 件数 | 備考 |
|---|---|---|---|---|---|
|  |  | prod |  |  |  |
