# codex-sync

Codexのセッションファイルを、利用者が用意したGitリポジトリ経由で複数マシン間に同期するスクリプトです。
omp（oh-my-pi）の標準状態ディレクトリがある場合、そのセッションも同期します。

## 下準備

各マシンで以下を準備してください。

- 共通: Git、書き込み可能なプライベートの同期用リポジトリ、Gitのコミット用ユーザー設定とリモートへの認証。
- Ubuntu: Bash、rsync。
- Windows: PowerShell 7以降（`pwsh.exe`）、robocopy。

1. セッション保存用のリモートリポジトリに、少なくとも1つのコミットと既定ブランチを作成します。
2. `git clone <同期用リポジトリのURL> ~/dev/codex-history`でクローンします。このcodex-syncリポジトリとは別のリポジトリです。Windowsでは`$HOME\dev\codex-history`に配置してください。
3. このcodex-syncリポジトリを、今後も移動・削除しない場所にクローンします。
4. 下記のOS別インストーラーを実行します。リンクの作成とユーザーPATH設定を行い、依存ツールの導入や同期用リポジトリの作成・同期の実行は行いません。
5. `codex-sync`を実行します。Windowsの実行ポリシーでps1が拒否される場合は、組織のポリシーに従って許可してください。

### Ubuntu

チェックアウトのルートで実行します。BashスクリプトはLFで保存してください。

```sh
bash ubuntu/install.sh
source ~/.bashrc
codex-sync
```

`~/.local/bin/codex-sync`からチェックアウト内のスクリプトへのシンボリックリンクを作り、実行権限を設定します。`~/.profile`と`~/.bashrc`にPATH設定を追記します。実行元シェルへは遡及しないため、上記の再読込、または新しいBashを使用してください。

### Windows

チェックアウトのルートでPowerShell 7から実行します。

```powershell
pwsh -NoProfile -File .\windows\install.ps1
$env:Path = "$HOME\bin\codex-sync;$env:Path"
codex-sync
```

`~\bin\codex-sync`からチェックアウトの`windows\`へのディレクトリジャンクションを作り、そのディレクトリをユーザーPATHへ登録します。管理者権限や開発者モードは不要です。cmdは同じディレクトリのps1を呼びます。`& .\windows\install.ps1`のように現在のPowerShellで実行した場合、そのプロセスのPATHにも反映されます。別プロセスの`pwsh -File`で実行した場合は、上記のPATH設定を現在のシェルで実行してください。他のアプリケーションでも永続PATHを使う場合は、サインアウト・サインインで環境を読み直してください。

### 導入後の更新と競合

- 同じチェックアウトで`git pull`すれば、次回の`codex-sync`から更新が反映されます。インストーラーの再実行は不要です。同期そのものは引き続き手動実行です。
- インストーラーは任意の作業ディレクトリから絶対パスで呼び出せます。空白を含むパスにも対応します。
- 同じチェックアウトから再実行してもPATH設定は重複しません。
- 配置先に通常ファイル・ディレクトリ・別のリンクがある場合は、上書きせず停止します。内容を確認して手動で退避してから再実行してください。以前のコピー導入が残っている場合は`type -a codex-sync`（Ubuntu）、`where.exe codex-sync`（Windows）で優先されるコマンドを確認してください。
- チェックアウトを移動する場合は、古いリンクだけを手動で削除してから移動先のインストーラーを実行してください。Windowsでは`cmd /c rmdir "%USERPROFILE%\bin\codex-sync"`でジャンクションだけを削除できます。リンク先のリポジトリ本体を削除しないでください。

## 同期するもの

| 対象 | ローカル | Gitリポジトリ内 | 有効条件 |
| --- | --- | --- | --- |
| Codex | `~/.codex/sessions/` | `sessions/` | 常に有効 |
| omp | `~/.omp/agent/sessions/` | `omp/sessions/` | 開始時に`~/.omp/agent/`が存在 |

ompは初回起動後に同期してください。まだ起動していなくても、`~/.omp/agent/`を作成すればリモートから初回取り込みできます。agentディレクトリがない場合はomp同期を省略し、ローカルの`.omp/`は作成しません。リポジトリにあるomp履歴は保持します。

設定、認証情報、`history.jsonl`、セッション一覧用インデックス、`agent.db`、sessions外の`blobs/`などは対象外です。ompの名前付きプロファイル、`PI_CODING_AGENT_DIR`・XDG・`--session-dir`などで変更した保存先も探索しません。セッション配下のディレクトリ構造と内容はそのままコピーし、内部の絶対パスは変換しません。両ツールのUIでの表示・再開可否は検証しません。

実行順序は、`git pull --rebase` → 有効な全対象をリポジトリからローカルへ取り込み → 全対象をローカルからリポジトリへ書き出し → 対象パスをステージ → 差分があれば1回コミット・push、です。ompの履歴にだけ変更がある場合も公開します。差分がなければコミットもpushも行いません。

## 上書き条件と注意点

| 項目 | Ubuntu | Windows |
| --- | --- | --- |
| コピー | `rsync -a` | `robocopy /E /XO` |
| リポジトリの同名ファイルが古い場合 | 取り込み時に新しいローカルを上書きし得る | 古いコピー元を除外し、新しいローカルを保持 |
| 片側にしかないファイル | 他方へコピーし、削除は伝播しない | 同左 |

- 同一セッションの内容をマージする機能はありません。実行前にCodexとompを終了し、同じセッションを複数マシンで同時に編集しないでください。上記の上書き条件は両ツールに共通です。
- 同期前にバックアップを取得してください。特にUbuntuでは、新しいローカルファイルが保護されるとは限りません。
- 同期用リポジトリには、事前に別のステージ済み変更を残さないでください。コミットに含まれる可能性があります。
- リポジトリがない場合やpull失敗時は停止します。pull失敗時はファイルコピーしません。
- Git競合の解決やpushの自動再試行は行いません。push失敗後に差分のない状態で再実行してもpushされないため、原因を解消したうえで同期用リポジトリから手動で`git push`してください。
- セッションには機密情報が含まれる可能性があります。同期先の公開範囲とアクセス権を確認してください。

## 開発・検証

開発規約は[AGENTS.md](AGENTS.md)、現状仕様は[session-sync](openspec/specs/session-sync/spec.md)と[command-installation](openspec/specs/command-installation/spec.md)を参照してください。OpenSpec CLIを利用し、資料→テスト→最小実装の順で進めます。AIツール固有の生成物は導入していません。

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
node --test tests/install.test.mjs
```

WindowsからWSL内のUbuntuも検証する場合は、対象ディストリビューションにGit・Bash・rsyncを用意して実行します。WSL側のNode.jsは不要です。`ubuntu/`のスクリプトは`.gitattributes`でLFを指定し、WSL検証でも一時コピーの改行をLFに統一します。

```powershell
$env:CODEX_SYNC_TEST_WSL_DISTRO = "Ubuntu-24.04"
node --test tests/session-sync.test.mjs
node --test tests/install.test.mjs
Remove-Item Env:CODEX_SYNC_TEST_WSL_DISTRO
```

テストは一時HOMEとローカルbareリモートを使用し、実際のCodex・ompデータや外部リモートには触れません。同期テストはompの往復、初回取り込み、未利用時の履歴保護、ompのみの変更、設定・認証の除外、pull失敗時の停止を検証します。導入テストはリンク経由の実行・更新反映、PATH設定、再実行、既存配置の保護を検証します。Windows導入テストはユーザーPATHを一時変更し、子プロセスの`finally`で復元します。他のインストーラーを同時実行しないでください。

## 更新履歴

### [2026/10/24] v0.3.0

- Ubuntu・Windowsに、リンクとPATHを自動設定するインストーラーを追加。
- リポジトリの更新を再インストールなしで利用できるようにし、Windowsのcmdを同じディレクトリのps1参照に修正。
- 導入・更新反映・再実行・既存配置の保護を検証する回帰テストを追加。

### [2026/10/24] v0.2.0

- ompの標準状態ディレクトリがあるマシンで、セッションを`omp/sessions/`へ同期する機能を追加。
- omp未利用時に履歴を取り込まず、リポジトリの履歴を保持する処理を追加。
- omp同期の回帰テストと、対象範囲・利用条件の説明を追加。

### [2026/10/24] v0.1.1

- OpenSpecによる現状仕様と変更管理手順を追加。
- 実データを使用しない同期処理の回帰テストを追加。
- セットアップ手順、同期対象、OSごとの上書き条件と既知の制約の説明を修正。
- 同期スクリプトの挙動は変更なし。

### [2026/09/28] v0.1.0

- 複数環境のCodexセッションをGit経由で同期するスクリプトを追加。
