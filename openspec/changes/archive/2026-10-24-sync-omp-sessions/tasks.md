# Tasks

## 1. 仕様・資料

- [x] 1.1 proposal、specs、designで条件付き同期を定義し、`openspec validate sync-omp-sessions --strict`が成功した。
- [x] 1.2 READMEとchangelogに同期先・有効条件・対象外を記載し、AGENTS.mdの要件と整合させた。

## 2. テスト・実装

- [x] 2.1 ompの往復、初回取り込み、未利用時の保護、ompのみの変更、対象外データ、pull失敗をテストに追加した。実装前は両OS合わせて8ケース中6件が失敗し、未実装の同期動作を検出した。
- [x] 2.2 両OSを対象一覧の処理に置き換えた。WindowsとUbuntu 24.04（WSL）で、既存動作を含む全20テストが成功した。

## 3. 統合検証

- [x] 3.1 実コマンドでWindows→ローカルbareリモート→Ubuntu→リモート→Windowsを往復した。Codexとompの双方について、両マシンの内容一致とリモートの4ファイルを確認した。一時データは削除済み。

## Workflow follow-up

- 検証後にarchiveし、`openspec validate --all --strict`で主仕様を確認する。
- 今回の変更を作業ブランチでコミットする。push・リリースは行わない。
