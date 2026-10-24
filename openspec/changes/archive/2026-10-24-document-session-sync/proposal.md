# Proposal

## Why

既存の同期処理には動作仕様と回帰テストがなく、OS間の上書き条件の違いが文書化されていない。OpenSpecを初期化し、挙動を変えずに現在の契約を記録する。

## What Changes

- OpenSpecのプロジェクト設定とAGENTS.mdの開発手順を整える。
- 同期対象、処理順序、OS別の上書き条件、既知の制約を現状仕様として記録する。
- 一時ディレクトリとローカルGitリポジトリで実スクリプトを動かす回帰テストを追加する。
- README.mdとchangelog.mdに使い方・検証方法・更新履歴を記載する。
- 同期スクリプトとWindowsランチャーは変更しない。

## Capabilities

### New Capabilities

- `session-sync`: 既存のGit経由のセッション同期を初めて仕様化する。新機能の追加ではない。

### Modified Capabilities

なし。

## Impact

OpenSpec資料、AGENTS.md、README.md、changelog.md、および開発用テストを追加・更新する。テストにはNode.js 18以降と各OSの実行依存が必要。同期処理の依存、保存形式、実行方法は変更しない。
