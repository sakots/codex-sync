# codex-sync

Codexのセッションファイルを、利用者が用意したGitリポジトリ経由で複数マシン間に同期するスクリプトです。
omp（oh-my-py）が導入されている場合、それも同期します。

## 下準備

各マシンで以下を準備してください。

- 共通: Git、書き込み可能なプライベートの同期用リポジトリ、Gitのコミット用ユーザー設定とリモートへの認証。
- Ubuntu: Bash、rsync。
- Windows: PowerShell 7以降（`pwsh.exe`）、robocopy。

1. セッション保存用のリモートリポジトリに、少なくとも1つのコミットと既定ブランチを作成します。
2. `git clone <同期用リポジトリのURL> ~/dev/codex-history`でクローンします。このcodex-syncリポジトリとは別のリポジトリです。Windowsでは`$HOME\dev\codex-history`に配置してください。
3. Ubuntuでは`ubuntu/codex-sync`をPATHの通った場所にコピーし、`chmod +x`を実行します。
4. Windowsでは`windows/codex-sync.ps1`と`windows/codex-sync.cmd`を`%USERPROFILE%\bin`にコピーし、このディレクトリをPATHに追加します。cmdはこの場所のps1を呼び出します。
5. `codex-sync`を実行します。Windowsの実行ポリシーでps1が拒否される場合は、組織のポリシーに従って許可してください。

## 同期するもの

- ローカル: `~/.codex/sessions/`
- Gitリポジトリ: `~/dev/codex-history/sessions/`
- 設定、認証情報、`history.jsonl`、セッション一覧用インデックスやデータベースなどは対象外です。CodexのUIでの表示・再開可否はこのスクリプトでは検証しません。

実行順序は、`git pull --rebase` → リポジトリからローカルへ取り込み → ローカルからリポジトリへ書き出し → `sessions/`をステージ → 差分があればコミット・push、です。差分がなければコミットもpushも行いません。

## 上書き条件と注意点

| 項目 | Ubuntu | Windows |
| --- | --- | --- |
| コピー | `rsync -a` | `robocopy /E /XO` |
| リポジトリの同名ファイルが古い場合 | 取り込み時に新しいローカルを上書きし得る | 古いコピー元を除外し、新しいローカルを保持 |
| 片側にしかないファイル | 他方へコピーし、削除は伝播しない | 同左 |

- 同一セッションの内容をマージする機能はありません。実行前にCodexを終了し、同じセッションを複数マシンで同時に編集しないでください。
- 同期前にバックアップを取得してください。特にUbuntuでは、新しいローカルファイルが保護されるとは限りません。
- 同期用リポジトリには、事前に別のステージ済み変更を残さないでください。コミットに含まれる可能性があります。
- リポジトリがない場合やpull失敗時は停止します。pull失敗時はファイルコピーしません。
- Git競合の解決やpushの自動再試行は行いません。push失敗後に差分のない状態で再実行してもpushされないため、原因を解消したうえで同期用リポジトリから手動で`git push`してください。
- セッションには機密情報が含まれる可能性があります。同期先の公開範囲とアクセス権を確認してください。

## 開発・検証

開発規約は[AGENTS.md](AGENTS.md)、現状仕様は[session-sync](openspec/specs/session-sync/spec.md)を参照してください。OpenSpec CLIを利用し、資料→テスト→最小実装の順で進めます。AIツール固有の生成物は導入していません。

```sh
openspec new change <変更名>
openspec status --change <変更名>
openspec instructions proposal --change <変更名>
# specs、design、tasksもinstructionsを参照して作成
openspec validate <変更名> --strict
# テスト・必要な実装・検証を行い、tasksを完了にする
openspec archive <変更名> --yes
openspec validate --all --strict
```

回帰テストにはNode.js 18以降と対象OSの実行依存が必要です。WindowsではPowerShellスクリプト、UbuntuではBashスクリプトを実行します。

```sh
node --test tests/session-sync.test.mjs
```

WindowsからWSL内のUbuntuも検証する場合は、対象ディストリビューションにGit・Bash・rsyncを用意して実行します。WSL側のNode.jsは不要です。WindowsのチェックアウトがCRLFの場合に備え、WSL検証では一時コピーの改行のみLFに変換します。Ubuntuへの手動配置時もBashスクリプトはLFで保存してください。

```powershell
$env:CODEX_SYNC_TEST_WSL_DISTRO = "Ubuntu-24.04"
node --test tests/session-sync.test.mjs
Remove-Item Env:CODEX_SYNC_TEST_WSL_DISTRO
```

テストは一時HOMEとローカルbareリモートを使用し、実際のCodexデータや外部リモートには触れません。初回取り込み、複数マシンの往復、OS別の上書き条件、変更なし、リポジトリ不在、pull失敗を検証します。Windowsのcmdランチャーのインストール状態は検証対象外です。

## 更新履歴

### [2026/10/24] v0.1.1

- OpenSpecによる現状仕様と変更管理手順を追加。
- 実データを使用しない同期処理の回帰テストを追加。
- セットアップ手順、同期対象、OSごとの上書き条件と既知の制約の説明を修正。
- 同期スクリプトの挙動は変更なし。

### [2026/09/28] v0.1.0

- 複数環境のCodexセッションをGit経由で同期するスクリプトを追加。
