# 実申請E2E・公開リリース手順

## 完了条件

運営者が作ったテスト回答ではなく、実在作品の作者本人による申請1件を、同じslugで次の工程へ通す。

`Forms申請 → SharePoint受付 → Canvas審査・承認 → GitHub Actionsの掲載PR → 人によるmerge → 手動Azure公開 → ライブ確認 → Canvasで公開済み`

公開リポジトリへ残す証拠はPR URL、merge SHA、production workflow URL、公開作品URLだけとする。Forms内部の回答識別情報、SharePoint内部URL、審査メモ、画像候補URL、スクリーンショットはコミットしない。

## 状態と停止線

| 状態 | 許可操作 | 成功 | 停止条件 |
| --- | --- | --- | --- |
| Forms回答 | 作者本人が送信 | SharePointへ1件だけ登録 | 同意・必須値不備は要確認。重複行を作らない |
| 未審査／要確認 | Canvasで公開項目を整え承認 | 承認 | 必須不足・競合時は変更しない |
| 承認 | GitHub同期、または審査に戻す | 掲載PR、または要確認 | 読取間でitem・状態・slug・版・更新日時が違えばPRなし |
| 掲載PR | 人が差分を確認してCI実行を許可し、現在行、公開内容、画像、CIを照合 | merge | 状態・版不一致、非公開情報、CI失敗ならmergeしない |
| merge済み | mainの対象SHAを手動公開 | ライブサイト更新 | デプロイ・表示・リンク失敗時は承認のまま |
| ライブ確認済み | Canvasで公開済みにする | 公開日時を記録 | ライブ確認前は変更しない |

GitHub側の再検証後からmergeまでの競合窓は残る。merge直前に、PRに記録されたSharePoint itemと受理時刻、現在の状態・更新時刻を人が再確認する。

## 実施チェックリスト

1. 本番サイトの「掲載申請フォームを開く」が、サインインなしの回答画面へ進むことをシークレットウィンドウで確認する。
2. 作者本人に、個人情報・顧客情報・秘密情報を含めず申請してもらう。画像は本人が掲載権限を持つ公開HTTPS URLだけを使用する。
3. Flow runが成功し、SharePointに同じ回答の行が1件だけ、初期状態が未審査または要確認で作成されたことを確認する。
4. CanvasでForms原文（作者、URL、Q6/Q8、画像候補）を確認し、公開値は編集せず承認する。ライセンス等の未収集値はフロー／Nodeの安全側既定値で生成される。
5. `Sync catalog lifecycle`を手動実行するか定期実行を待ち、同じslugのPRが1件だけ作成されたことを確認する。
6. PRへ非公開情報やWorkflow変更が含まれないことを確認し、**Approve workflows to run** でCIを開始する。画像がある場合は1200×675 WebPへ再エンコードされ、画像がない場合はフォールバックが明示され、CIが成功していることを確認する。
7. merge直前に現在のSharePoint状態と更新時刻を再照合し、人がmergeする。
8. `Deploy production`を対象main SHAで手動実行し、production承認後に成功することを確認する。
9. 公開作品URLで本文、画像、配布リンク、スマートフォン表示を確認する。
10. すべて成功した後だけCanvasで公開済みにする。

失敗した工程より後ろへ進めない。再試行時も同じslugを使用し、重複PRや重複掲載を作らない。

## 実申請E2E記録（2026-08-28）

- 作者本人の申請 `decision-flow` は、Forms受付、重複なしのSharePoint登録、Canvas審査・承認、公開候補生成まで成功した。
- GitHub同期が公開許可項目だけの [Pull Request #12](https://github.com/PLUG365/PLUGSolutions/pull/12) を作成した。画像は未指定のため文字サムネイルへフォールバックし、画像候補URLや審査情報はPRへ出力されなかった。
- PRのCI実行を人が許可し、CI成功後にmergeした。merge SHAは `b34a73ebb92ec7beb597133e88787677912f8ba0` で、同じSHAに対するmain CIも成功した。
- [production workflow #8](https://github.com/PLUG365/PLUGSolutions/actions/runs/33078796548) をmainから手動実行し、人が`production`を承認した後に成功した。重複起動した古い2実行はconcurrency制御でキャンセルされ、同時デプロイされなかった。
- [公開作品ページ](https://kind-stone-076361900.7.azurestaticapps.net/solutions/decision-flow/) と一覧はHTTP 200を返し、作品名、作者X、配布先、文字サムネイルを確認した。HTMLにForms回答識別情報、同意記録、審査メモ、画像候補URL、内部版情報は存在しなかった。
- GitHub `production` Environmentには匿名回答用の掲載フォームURLを登録済み。Loungeの公開状態はproduction変数の`NEXT_PUBLIC_LOUNGE_MODE`で切り替える。
- スマートフォンでの最終表示・リンク確認後、Canvasで同じ申請を`公開済み`にした。更新を受けた公開候補フローは成功し、`承認`専用のJSON生成処理は条件不成立でスキップされた。これにより実申請E2Eを完了とした。

## PLUG Lounge

Loungeは固定roomを常設で埋め込む。productionの公開変数へ、ASCII 8〜64文字のroom名を設定し、`NEXT_PUBLIC_LOUNGE_MODE=open` にする。入室前には短い同意ページを表示し、参加者が確認した後だけiframeを生成する。PLUG側では開催時間、在室者数による自動閉室を設けない。`private=1` はchat.exeの部屋一覧から隠す設定であり、認証ではない。room名と直URLはブラウザへ配られるため秘密として扱わない。

緊急時は `NEXT_PUBLIC_LOUNGE_MODE=closed` へ変更して手動再デプロイし、PLUGページからiframeを外す。これはPLUG側の接続導線を閉じる操作であり、参加者が既に知っているchat.exeの旧room直URL自体を停止・削除する機能ではない。

公開前にデスクトップ、iPhone Safari、Android Chromeで次を人が確認する。

- `open` と有効なroom名のとき、ページを開くと同意ページが表示され、確認後に指定roomのiframeが表示される。`closed` またはroom未設定時はiframeがない。
- 同意前はchat.exeのiframeがなく、接続が発生しない。
- テキスト送受信でき、別roomへの移動、カメラ、マイク、画面共有はPLUGページから利用できない。
- ソフトキーボード表示、縦横回転、ページ移動後の再入室が扱いやすい。
- 既知の旧room直URLはPLUG側から停止できないことを確認する。

kick、block、reportなど十分なモデレーション手段が確認できない場合、一般公開・常設化へ進めない。
