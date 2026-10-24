# Spec Delta

## MODIFIED Requirements

### Requirement: 同期対象とリポジトリの前提

スクリプトは`~/dev/codex-history`を同期用リポジトリとし、Codexの`~/.codex/sessions`をリポジトリの`sessions/`と同期しなければならない（MUST）。`.git`が存在しない場合は非ゼロで終了しなければならない（MUST）。有効なリポジトリでは両方のCodex sessionsディレクトリを必要に応じて作成しなければならない（MUST）。ompは条件付き同期の要件に従う。

#### Scenario: 同期用リポジトリがない

- **WHEN** 利用者のホームに同期用リポジトリの`.git`が存在しない
- **THEN** 非ゼロで終了し、ローカルのsessionsディレクトリを作成しない

#### Scenario: 初回取り込み

- **WHEN** 有効な同期用リポジトリがあり、ローカルのsessionsディレクトリが存在しない
- **THEN** ディレクトリを作成して同期を進める

### Requirement: 差分のコミットと公開

スクリプトは`sessions/`と、有効時のみ`omp/sessions/`をステージし、ステージ済み差分があればコミットしてpushしなければならない（MUST）。差分がなければ新しいコミットもpushも行ってはならない（MUST NOT）。この契約の前提として、実行前の同期用リポジトリに利用者が別のステージ済み変更を残さないものとする。

#### Scenario: ローカルの新しいセッションを公開する

- **WHEN** ローカルにのみ存在するセッションを同期する
- **THEN** セッションがリモートの新しいコミットに含まれ、別マシンから取得できる

#### Scenario: 同じ状態で再実行する

- **WHEN** 前回の同期後にファイルが変更されていない
- **THEN** リモートと同期用リポジトリのコミットIDは変わらない

## ADDED Requirements

### Requirement: ompの条件付き同期

スクリプトは開始時に`~/.omp/agent/`がディレクトリとして存在する場合のみ、`~/.omp/agent/sessions/`とリポジトリの`omp/sessions/`を同期対象に加え、必要なsessionsディレクトリを作成しなければならない（MUST）。対象配下全体を既存の処理順・OS別上書き・削除規則でコピーしなければならない（MUST）。対象外ならローカルの`.omp/`を作成せず、リポジトリのomp履歴を保持しなければならない（MUST）。

#### Scenario: omp履歴を複数マシンで共有する

- **WHEN** 両マシンにompのagentディレクトリがあり、それぞれに別のセッションがある
- **THEN** 順次同期すると両方のセッションと配下の付随ファイルが両マシンとリモートに揃い、Codexの同名ファイルとは混ざらない

#### Scenario: ompの初回取り込み

- **WHEN** agentディレクトリはあるがsessionsはなく、リモートにomp履歴がある
- **THEN** ローカルのsessionsを作成して取り込む

#### Scenario: ompのローカル状態がない

- **WHEN** agentディレクトリがなく、リモートにはomp履歴がある
- **THEN** Codexだけを同期し、ローカルの`.omp/`を作らずリモートのomp履歴を削除しない

#### Scenario: ompの履歴にだけ変更がある

- **WHEN** Codexには差分がなく、ompにだけ新しいセッションがある
- **THEN** ompのセッションをコミット・pushし、差分のない再実行ではコミット・pushを行わない

#### Scenario: セッション以外のompデータを保持する

- **WHEN** agent配下に設定・認証・データベースなどのsessions以外のファイルがある
- **THEN** それらを同期リポジトリにコピーしない

#### Scenario: pull失敗時にompもコピーしない

- **WHEN** ompが有効でpullに失敗する
- **THEN** omp履歴の取り込み・書き出し・コミット・pushも行わない
