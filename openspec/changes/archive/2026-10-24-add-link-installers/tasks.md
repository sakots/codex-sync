## 1. 資料

- [x] 1.1 proposal、specs、design、tasksとREADME・changelogを実装前に整える
- [x] 1.2 `openspec validate add-link-installers --strict`を通す

## 2. テスト

- [x] 2.1 一時HOMEで初回導入、PATH設定、再実行、リンク経由の更新反映を確認する回帰テストを追加し、実装前の失敗を確認する
- [x] 2.2 通常ファイル・ディレクトリ・別リンクと壊れたリンクの競合保護を検証する

## 3. 実装

- [x] 3.1 Ubuntuのシンボリックリンク導入と起動設定を実装する
- [x] 3.2 Windowsのジャンクション導入とユーザーPATH設定、cmdの相対参照を実装する
- [x] 3.3 UbuntuソースのLF指定を追加する

## 4. 検証

- [x] 4.1 WindowsとWSL Ubuntuで導入・更新反映の実動作を確認する
- [x] 4.2 `node --test tests/session-sync.test.mjs`と導入テストを通す
- [x] 4.3 tasksを完了にし、アーカイブと全仕様のstrict検証を行う
