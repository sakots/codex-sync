# Proposal

## Why

AGENTS.mdとREADME.mdにompの同期要件が追加されたが、現在はCodexのセッションしか同期できない。ompを使用しているマシンで、その標準セッション保存先も既存のGit同期へ含める。

## What Changes

- `~/.omp/agent/`が存在する場合に`~/.omp/agent/sessions/`とリポジトリの`omp/sessions/`を同期する。
- ompのローカル状態ディレクトリがないマシンでは、リモートにomp履歴があっても同期を省略し、ローカルの`.omp/`を作らない。
- Codexとompを同じpull・コミット・pushで処理し、既存のOS別上書き規則と削除を伝播しない方針を維持する。
- README、更新履歴、回帰テストを拡張する。

## Capabilities

### New Capabilities

なし。

### Modified Capabilities

- `session-sync`: Codexに加え、ローカル状態のあるompの標準セッション保存先を条件付きで同期する。

## Impact

UbuntuとWindowsの同期スクリプト、既存の隔離テスト、OpenSpec仕様と利用資料を更新する。データ移行・新しい実行依存・設定や認証情報の同期は追加しない。
