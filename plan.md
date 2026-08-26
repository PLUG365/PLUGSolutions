# PLUG Solutions v1 — Azure Static Web Apps 公開構成

## 実装状況（2026-08-26）

- 完了：標準 Next.js 静的出力、公開 JSON スキーマ、一覧・詳細・404、MIT 表示、PLUG ブランド反映。
- 完了：lint、カタログ検証、テスト、静的ビルドを実行する GitHub Actions CI。
- 完了：人が確認済みのローカル画像を 1200×675 WebP に再エンコードし、メタデータを除去する処理とテスト。
- 完了：公開リポジトリ `PLUG365/PLUGSolutions`、GitHub Actions CI、main 保護、`production` Environment の minoru365 承認ゲート。
- 完了：Azure Static Web Apps `plug-solutions-web`（Free／East Asia）と、`production` Environment Secretへのデプロイトークン登録。
- 完了：更新を `main` に蓄積し、任意のタイミングで開始する手動本番リリースと `minoru365` 承認ゲート。
- 完了：Microsoft Forms「PLUG Solutions 掲載申請」、非公開 SharePoint サイト／審査リスト、`みのる環境` の Power Automate 取込フロー。有効化済み。正常回答の `未審査` 登録、入力不備の `要確認` 登録、同一回答の再処理による重複防止を確認済み。
- 完了：審査リストの公開用構造化項目、非公開 `Exports` ライブラリ、承認済み申請から公開JSON候補を上書き生成するフロー。有効化済み。
- 完了：`みのる環境` のアンマネージドSolution `PLUGSolutions`（publisher `PLUG365`、prefix `plug`）へ2本のフローと2件のconnection referenceを所属させ、ローカルでunpack／再packを検証。unpack結果はtenant固有bindingを含むためGit管理外とし、placeholder-based templateを追跡する。
- 完了：公開JSON候補フローの初回動作試験。`未審査` は出力なし、`承認` は1件生成、同一slugは上書き、公開禁止フィールドなし、公開スキーマ適合を確認済み。
- 完了：承認済みJSON候補を検証し、明示操作時だけ `catalog/solutions/<slug>.json` へ取り込むローカルコマンド。既存slug、非公開項目、未処理画像を安全側で拒否する。
- 完了：Default環境のCanvas App `PLUG Solutions Review` をSharePoint審査リストへ接続し、PC・タブレットの一覧＋詳細とスマホ用1列詳細を生成。保存・承認・却下の必須値／競合ガードを含めCanvas Authoringコンパイル済み。PC二ペイン表示、600px幅の一覧、iPhone 390×844での一覧→詳細遷移と縦スクロールを実画面確認済み（データ更新操作は未実施）。
- 完了：承認済みSharePoint行を読取専用で取得し、公開許可項目だけのJSON、SSRF対策付き画像取得、1200×675 WebP処理、専用branchと掲載PRを準備するGitHub Actionsとテスト。画像なし・通常の画像失敗は文字サムネイルへフォールバックし、危険なURLは処理を拒否する。
- 実装完了・実環境確認待ち：`公開済み → 取り下げ` をPower Appsで理由必須・競合ガード付きで記録し、SharePoint履歴を残したまま同一slugの公開JSONとWebPだけを削除PRへ送る動線。PLUG所有ロゴは公開URLからの取得、1200×675 WebP化、メタデータ除去まで実経路で確認済み。掲載PRへの追加と取り下げPRでの削除を実環境で確認する。
- 確認済み：Microsoft 365 Business BasicのForms／SharePoint／Power Automate Standardコネクタ利用権で現行構成を実行でき、匿名回答者のPower Automateライセンスは不要。
- 完了：専用Entraアプリ `PLUG Solutions GitHub Intake`、Graph `Lists.SelectedOperations.Selected` の管理者同意、`PLUG365/PLUGSolutions` のimmutable `main` 限定OIDC、掲載申請リストの `read` 権限、GitHub Repository variables 4件を設定。Azure Subscription RBACと長期クライアントシークレットは使用しない。実環境から権限を再読取確認済み。
- 完了：`PLUG365` Organizationと `PLUGSolutions` repositoryでActionsによるPR作成・承認の複合許可を有効化。既定Workflow権限は `read` のまま。設定時だけ一時追加したGitHub CLIの `admin:org` scopeは削除済み。自動承認処理は実装せず、既存のmain保護と人の承認を維持する。
- 未実施：Workflowのremote反映、実データでの掲載PR初回試験、Developer環境から本番利用可能な環境へのSolution移行、Application Insights。SharePointへの画像状態書戻しはv1では行わず、PRを処理状態の正本とする。
- 人手ゲート：本番環境へのSolution import／接続設定／フロー有効化、初回を含むAzure本番デプロイ、Forms公開設定、SharePoint権限、アクセス解析は、各サービス上の設定確認後に有効化する。

## 方針

- ChatGPT Sites は廃止し、公開先を Azure Static Web Apps に変更する。
- 現在の UI を通常の Next.js 静的サイトへ移し、特定ホスティング専用コードを持たない。
- ソースは公開リポジトリ `PLUG365/PLUGSolutions` で管理し、MIT License、著作権表示は `minoru365` とする。
- GitHub Actions でテスト・静的ビルド・Azure 公開を自動化する。
- Microsoft Forms と SharePoint は非公開の受付・審査基盤、Azure Static Web Apps は承認済み情報だけを扱う公開基盤とする。
- Power Pages と GitHub Pages は v1 では使用しない。

## 対象領域とポジショニング

- PLUG Solutions は Power Platform 専用サイトにせず、個人が公開する「持ち帰って使えるソリューション」を技術横断で扱う。
- Power Platform は運営者が接点と知見を持つ最初の強いカテゴリとするが、サービス全体の境界にはしない。
- 掲載対象は Web、モバイル、デスクトップ、OSS、AI ツール、Power Apps、Power Automate、Copilot Studio、Dataverse solution、PCF、テンプレートなどとする。
- サイトの主メッセージは「個人がつくった、使えるアイデアを見つけ、試して、持ち帰り、自分の環境で育てられるソリューションカタログ」とする。
- 「新作を応援する場所」より、導入条件、配布物、ライセンス、必要環境を比較して実際に利用できる場所として差別化する。
- 分類とナビゲーションは、仕事効率化、暮らし・家計、学習、クリエイター支援、コミュニケーション、開発者ツールなどの用途を主軸にする。
- Web、iOS／Android、Power Apps、Power Automate、AI、OSS などの技術・成果物形式は絞り込み条件にする。
- 運営者表記は「minoru365 による個人運営」とし、Microsoft 公式サービスではないことを明示する。

## 初期掲載と周知

### 初期掲載

- 広い対象領域を保ちながら、最初は Power Platform コミュニティを主要な作者獲得経路にする。
- 公開前に作者 10 人へ個別に掲載を依頼し、5 人以上の申請獲得を最初の需要検証とする。
- 正式公開時は最低 10 件、目標 20 件以上の承認済み作品を掲載する。
- 目標 20 件の目安は Power Platform 10 件、Web・AI アプリ 5 件、モバイル・デスクトップ・OSS など 5 件とし、固定枠ではなくサイトの広さを伝えるための初期構成とする。
- 作者本人による申請だけを掲載する原則を維持し、運営者が無断転載して件数を埋めない。

### 周知方法

- 最初は有料広告を使用せず、作者への個別依頼と作者本人による掲載ページ共有を中心にする。
- 各作品ページへ専用 OG 画像、X 共有ボタン、共有文例を用意し、掲載完了時に作者へ渡す。
- 正式公開は初期作者と共有時期を合わせ、複数作品が同じ期間に紹介される状態を作る。
- Power Platform 向けには「導入条件込みで成果物を持ち帰れる場所」、個人開発向けには「公開作品がタイムラインに流れて終わらない場所」として伝える。
- 優先チャネルは、作者への X での個別依頼、X での正式公開、Qiita／Zenn の開発記事、Power Platform や個人開発の勉強会・LT、関連コミュニティの順とする。
- 公開後は週 1 回を目安に、新着作品、Premium 不要、短時間導入、用途別作品、導入報告などの編集記事や投稿を継続する。
- Product Hunt などの海外向けサービスは、日本語圏で掲載と利用実績ができた後に検討する。

### 初期の成功指標

- 作者 10 人への依頼から 5 人以上が申請する。
- 公開時に承認済み作品が 20 件前後ある。
- 掲載作者の半数以上が自分の作品ページを共有する。
- 作品詳細から配布先、導入手順、ソースへのクリックが発生する。
- 公開後 30 日以内に「導入できた」リアクションが 3 件以上集まる。
- ページビューや「いいね」だけを主要指標にせず、持ち帰りクリックと導入報告を重視する。

## サイトとホスティング

### ポータブルな静的サイト化

- Vinext を通常の Next.js へ置き換え、`output: "export"`、末尾スラッシュ有効、画像最適化は静的出力対応に設定する。
- ビルド成果物を標準的な `out` ディレクトリへ出力する。
- `.openai/hosting.json` と Sites／Cloudflare Worker 専用依存を削除する。
- 既存の ChatGPT Sites 上のサイトは自動削除せず、Azure 版公開後も別物として残す。以後の更新対象からは外す。
- 一覧、検索、絞り込みはブラウザ内で動作させ、Azure Functions などのサーバー API は v1 では作らない。

### Azure 構成

- Azure サブスクリプション：既定の `Minoru-PAYG`
- 新規リソースグループ：`plug-solutions-prod-rg`
- Static Web Apps 名：`plug-solutions-web`
- SKU：Free
- Functions リージョン：East Asia
- 初期 URL：Azure が発行する `*.azurestaticapps.net`
- 独自ドメインは名称確定後に追加する。Free プランではカスタムドメイン 2 個まで利用可能。

### GitHub Actions

- 日々の変更は保護された `main` へ蓄積し、本番デプロイは GitHub Actions の `workflow_dispatch` から任意のタイミングで開始する。
- Pull Request では秘密情報を使わず、テストと静的ビルドだけを行う。v1 では Azure のプレビュー環境へ自動デプロイしない。
- ワークフロー内で Node 22、`npm ci`、JSON 検証、テスト、静的ビルドを実行する。
- ビルド済み `out` を `skip_app_build: true` で Azure へ渡し、Azure 側の暗黙ビルドに依存しない。
- Azure のデプロイトークンは GitHub Actions Secret だけに保存し、リポジトリ、ログ、設定ファイルへ出力しない。
- Azure のデプロイトークンは GitHub の `production` Environment Secret とし、Repository Secret には置かない。
- 手動リリースは `main` 以外からの起動を拒否し、起動時点のコミット SHA を再検証したうえで、`production` Environment で `minoru365` の承認後に実行する。
- Organization メンバーは Azure テナント権限を持たなくても CI を実行できるが、承認なしでは本番 Secret を利用できない構成にする。

## カタログデータと申請フロー

### Forms・SharePoint

- minoru365 の職場アカウントで、作者本人専用の匿名 Microsoft Forms を作成する。
- 「匿名」は Forms へのサインインと氏名・メールの自動取得がないことを指す。公開用の作者表示名と X アカウントは入力・公開するため、サイト上は「サインイン不要」と表記する。
- 設問、公開／非公開区分、Forms 設定、公開前確認は `docs/submission-form.md` を正本とする。
- 氏名・メールは取得せず、公開用 X アカウント名を必須にする。
- サムネイルは公開画像 URL を任意受付し、ファイルアップロードは使用しない。
- Power Automate で回答を専用 SharePoint サイト「PLUG Solutions」の審査リストへ転記する。
- `ResponseId` を一意キーにして Webhook 再配信時の重複登録を防ぐ。
- 審査状態は `未審査／要確認／承認／却下／公開済み／取り下げ` とする。

### 公開用 JSON

- 人が作品、作者 X、URL、ライセンス、費用、導入条件、画像権利を確認して slug を設定し、「承認」にする。
- 承認時に Power Automate が非公開ライブラリへ `Exports/<slug>.json` を生成・更新する。
- JSON には公開情報だけを含め、回答 ID、氏名、メール、同意記録、審査メモ、画像候補 URL を含めない。
- GitHub Actionsが承認済み行を対象リストから読取専用で取得し、`catalog/solutions/<slug>.json` と処理済み画像の専用branch／PRを作る。
- SharePoint承認だけでは `main` へ反映せず、サイトも公開しない。人がPRを確認・承認・mergeする。
- 公開スキーマは `schemaVersion`、slug、作品名、作者 X、概要、種類、カテゴリ、タグ、配布・ソース・手順 URL、ライセンス、費用、Premium 要否、導入時間、前提条件、ローカル画像パス、公開日、更新日で固定する。

### サイト表示

- 各作品に `/solutions/<slug>/` の恒久 URL を生成する。
- 個別ページに作品情報、導入条件、作者 X、ライセンス、外部リンクを表示する。
- 作品単位の title、description、OG 情報を静的生成する。
- 存在しない slug には静的 404 を返す。
- 一般公開前に架空の作品、導入数、コミュニティ活動を削除し、承認済みの実在作品へ差し替える。
- 実測していない導入数や「確認済み作者」バッジは表示しない。

## サムネイル処理

- 回答に記載された画像 URL は、Power Appsで人が権利と内容を確認して承認した後だけGitHub Actionsが取得する。
- HTTPS、公開IP、資格情報なし、リダイレクト再検証、10 MB・25 MP以内のPNG／JPEG／WebPだけを受け付ける。
- 1200×675 px、WebP 品質 82、余白調整方式で再エンコードし、EXIF・位置情報を除去する。
- 処理済み画像だけをリポジトリへ追加し、公開サイトから外部画像を直接読み込まない。
- 画像なし、処理失敗、審査 NG の場合は現在の色・文字サムネイルを使用する。

## アクセス解析・リアクション

### アクセス解析

- 静的サイトへ Application Insights のブラウザ SDK を組み込み、アクセス傾向を運営者だけが確認する。
- v1 ではアクセス数やユニークユーザー数をサイト上に公開しない。
- 計測対象はページ表示、作品 slug、検索・カテゴリ利用、配布先・作者 X・掲載申請ボタンのクリックに限定する。
- Cookie と永続的なユーザー識別を無効化し、ユニークユーザー数ではなくページビューと操作回数を参考値として扱う。
- URL のクエリ文字列、自由入力、X アカウント、氏名、メール、ユーザー ID をテレメトリへ送信しない。
- リファラーは必要ならドメイン部分だけを記録し、完全な URL は保存しない。
- Application Insights の保持期間は初期値を 30 日とし、収集項目、Azure リージョン、料金を本番公開前に人が確認する。
- ブラウザの計測拒否、広告ブロッカー、JavaScript 無効化などによる欠測を許容し、アクセス数を正確な実利用者数として扱わない。

### リアクション

- v1 のリアクションは `気になる／使ってみた／導入できた` の 3 種類とし、コメントや自由記述は受け付けない。
- 作品ページのボタンから、サインイン不要の匿名 Microsoft Forms を開く。
- Forms では対象作品とリアクション種別だけを受け付け、氏名、メール、X アカウントは収集しない。
- Power Automate で、対象 slug、リアクション種別、回答日時、内部回答 ID を非公開の SharePoint リストへ保存する。
- 内部回答 ID でフロー再試行による重複登録を防ぐ。同一人物による複数回答は匿名受付では完全に判定できないため許容する。
- ブラウザの `localStorage` は同一端末での誤連打防止にだけ使用し、不正防止や本人識別には使用しない。
- 公開時は人数ではなく「リアクション数」と表記する。
- 集計結果だけを `catalog/reactions.json` に取り込み、個別回答、回答日時、内部回答 ID は公開しない。
- 集計 JSON は公開作業時または週次で更新し、リアルタイム反映は行わない。
- 荒らしや大量投稿が運用上の問題になった場合のみ、リアクション部分を Azure Functions と Azure Table Storage へ移行し、レート制限などを追加する。

### コメントと交流

- サイト内コメント、返信、ダイレクトメッセージ、ユーザーアカウントは v1 では実装しない。
- 交流は作者の公開 X アカウントや配布先へ誘導する。
- 不適切な掲載、リンク切れ、権利侵害、取り下げ依頼は、リアクション用とは別の匿名 Forms で受け付ける。

## 状態・検証・人手ゲート

| 操作 | 状態遷移 | 実行者 |
| --- | --- | --- |
| Forms 回答 | なし → 未審査／要確認 | Power Automate |
| 同一回答の再処理 | 既存 → 変更なし | Power Automate |
| 内容審査 | 未審査／要確認 → 承認／却下 | 人 |
| JSON 生成 | 承認 → 承認 | Power Automate |
| GitHub 取込 | 承認 → 承認 | 人 |
| Pull Request | 変更 → CI 合格／不合格 | GitHub Actions（Azure Secret なし） |
| main 反映 | CI 合格 → リリース候補 | 人の merge＋GitHub Actions CI |
| 手動リリース開始 | リリース候補 → 本番承認待ち | minoru365＋GitHub Actions |
| Azure 公開 | 本番承認待ち → 公開済み | minoru365 承認＋GitHub Actions |
| 取り下げ | 公開済み → 取り下げ | 登録 X からの依頼を人が確認 |
| リアクション回答 | なし → 非公開記録 | Forms＋Power Automate |
| 同一リアクション回答の再処理 | 既存 → 変更なし | Power Automate |
| リアクション集計 | 非公開記録 → 公開集計 JSON | Power Automate＋人 |

- JSON スキーマ、必須項目、HTTPS URL、slug 形式、重複 slug、日付、公開禁止フィールドを自動検証する。
- Forms 障害、SharePoint 障害、フロー再試行でも欠落・二重登録が起きないことを確認する。
- 一覧、検索、カテゴリ、個別ページ、404、OG 情報、モバイル、アクセシビリティを検証する。
- 処理済み画像の形式、寸法、容量、メタデータ除去、代替表示を検証する。
- Application Insights に禁止項目、完全なリファラー URL、クエリ文字列、永続的なユーザー ID が送られないことをブラウザの通信ログで確認する。
- Cookie を無効にした状態でページビューと許可済みイベントだけが記録されることを確認する。
- リアクションの対象 slug と種別を検証し、存在しない slug や未定義の種別を集計へ含めない。
- フロー再試行でも同じ内部回答 ID が二重計上されないことを確認する。
- 公開用リアクション JSON に個別回答、回答日時、内部回答 ID、その他の非公開フィールドが含まれないことを確認する。
- GitHub 公開前に、MIT 表示、秘密情報不在、Sites 固有 ID 不在を確認する。
- Azure 作成前にサブスクリプションと専用リソースグループを再確認する。
- GitHub Organization への Azure 連携権限、リポジトリ公開、`production` Environment、デプロイトークン登録、本番初回公開は人が確認する。
- Azure 標準 URL での実サイト確認後に SharePoint 状態を「公開済み」へ更新する。

## 将来方針

- 独自ドメインは Azure 版の運用確認後に追加する。
- PLUGGuide との相互リンクや GitHub Issue 連携は任意の後続機能とする。
- 作者ログイン、セルフ更新、コメント、役割別権限が必要になった場合のみ、Power Pages＋Dataverse を再評価する。
- Azure Static Web Apps は標準静的成果物を配信するだけなので、将来 Cloudflare Pages、GitHub Pages、通常の Web サーバーへ移してもサイト本体を作り直さない。
