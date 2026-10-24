# Tasks

## 1. 現状仕様と開発手順

- [x] 1.1 OpenSpecを初期化し、AGENTS.mdと設定に資料ファースト・隔離テストの方針を記載した。`openspec validate document-session-sync --strict`が成功。
- [x] 1.2 session-sync仕様、README.md、changelog.mdに現状動作・OS差・制約・実行方法を記載し、既存スクリプトとの整合を確認した。

## 2. 回帰検証

- [x] 2.1 隔離された実行テストを追加した。リポジトリ不在、初回取り込み、複数マシン間の往復、同名ファイルのOS差、変更なし、pull失敗の6ケースを各OSで確認した。
- [x] 2.2 WindowsとUbuntu 24.04（WSL）で計12テストが成功。別途、実コマンドでWindows→ローカルbareリモート→Ubuntu→リモート→Windowsを往復し、両側とリモートのセッション内容を確認した。同期スクリプトは変更していない。

## Workflow follow-up

- 検証完了後に変更をarchiveし、`openspec validate --all --strict`で主仕様を確認する。
- AGENTS.mdの形式に従って作業ブランチへコミットする。リリースはしない。
