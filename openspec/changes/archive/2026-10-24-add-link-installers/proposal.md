# Proposal

## Why

現在はスクリプトを手作業でコピーするため、リポジトリを更新しても配置済みのコマンドは更新されない。UbuntuとWindowsで一度導入すれば、同じチェックアウトの更新をそのまま利用できるようにする。

## What Changes

- UbuntuにシンボリックリンクとユーザーPATHを設定する`ubuntu/install.sh`を追加する。
- Windowsに管理者権限不要のディレクトリジャンクションとユーザーPATHを設定する`windows/install.ps1`を追加する。
- Windowsのcmdランチャーを自身と同じディレクトリのps1を呼ぶ方式に変更する。
- 再実行を安全に扱い、既存の別ファイル・別リンクは上書きしない。
- READMEのコピー手順をリンクによる導入手順に置き換える。

## Capabilities

### New Capabilities

- `command-installation`: 両OSのリンク型コマンド導入、PATH設定、更新反映、競合時の保護。

### Modified Capabilities

なし。既存の同期処理は変更しない。

## Impact

Ubuntu・Windowsのインストーラー、Windowsのcmdランチャー、導入回帰テスト、README、changelogに影響する。Git・rsync・PowerShellなどの依存導入、同期用リポジトリの作成、自動同期は対象外。チェックアウトは導入後も同じ場所に保持する。
