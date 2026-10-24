# Design

## Context

目的はproposal.mdを参照。現行コードはUbuntuのBashとWindowsのPowerShellで、上書き条件が異なる。実行時のホームディレクトリと固定されたリポジトリパスを前提としている。

## Goals / Non-Goals

**Goals:** 実スクリプトを隔離環境で動かし、session-sync仕様の主要な成功・失敗経路を検証する。

**Non-Goals:** 同期処理の修正、OS差の解消、設定パスの追加、push再試行、競合の自動解決、リリース。

## Decisions

- OpenSpecは`--tools none`で初期化する。特定のAI製品向け生成物は追加せず、AGENTS.mdを共通の入口にする。
- テストはNode.js標準のtest runnerと実際のGitを使用する。モックよりもコミット・リモートへの反映を直接検証でき、追加パッケージも不要。
- 各テストに一時HOME、ローカルbareリモート、初期化用リポジトリ、同期用クローンを作る。Gitのグローバル設定と認証・署名設定を隔離する。
- Windowsは子PowerShellのHOMEを上書きし、呼び出したスクリプトの終了コードを明示的に返す。UbuntuはHOME環境変数を指定してBashで起動する。製品コードにテスト用オプションは追加しない。
- WindowsからのUbuntu検証は任意の`CODEX_SYNC_TEST_WSL_DISTRO`で指定したWSLを使用し、wslpathでパスを変換する。WindowsのCRLFチェックアウトに対応するため、一時ディレクトリにLFへ変換したBashスクリプトのコピーを作って実行する。Ubuntuでの通常実行にはWSLも変換も不要。
- 既存動作を仕様化する作業なので、資料→回帰テスト→実行確認の順で進め、同期処理に変更を加える工程は不要とする。

## Risks / Trade-offs

- [Ubuntuの取り込みが新しいローカルファイルを上書きし得る] → 現状を仕様・README・回帰テストに明記し、今回は修正しない。
- [Git競合やpush失敗からの復旧は自動化されていない] → 利用条件と制約をREADMEに明記する。
- [Node.jsがテストに必要] → 開発時のみの依存とし、同期スクリプトには不要と記載する。
- [Windowsランチャーは利用者のbinに固定されている] → 配置条件をREADMEに明記し、隔離テストではps1を直接実行する。

## Migration Plan

データ移行はない。検証後にOpenSpecの変更をarchiveして初回の主仕様を生成する。取り消す場合も同期データへの変更はなく、導入した資料・テストのみを対象とする。
