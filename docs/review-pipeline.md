# 掲載申請の非公開審査パイプライン

## 今回の対象

- Microsoft Forms「PLUG Solutions 掲載申請」の回答を取得する。
- 回答を運営者だけが利用する SharePoint リストへ転記する。
- `ResponseId` を一意キーとして、Power Automate の再試行で二重登録しない。
- フローは停止状態で作成し、人が接続、権限、列対応を確認してから個別に有効化する。

Power Automateの責務は、承認後の非公開JSON候補生成までとする。GitHubへの取込は別系統のGitHub Actionsが対象リストを読取専用で参照し、専用branchとPull Requestを作成する。本番公開、通知、リアクション受付は対象外とする。

## 状態と操作

| 操作 | 事前状態 | 許可する結果 | 拒否・停止する条件 |
| --- | --- | --- | --- |
| Forms 新規回答 | `ResponseId` が未登録 | 同意・必須値・Xハンドル・HTTPS配布URLが妥当なら `未審査`、それ以外は `要確認` で1件作成 | 回答詳細を取得できない場合だけ停止し、回答を失わないため入力不備は保存して人が確認する |
| 同一回答の再処理 | 同じ `ResponseId` が登録済み | 既存行を変更せず正常終了 | 2件目を作成しない |
| 人による審査 | `未審査` または `要確認` | `承認` または `却下` | 自動承認しない |
| 公開準備 | `承認` | 人が slug と公開項目を補完・確認 | Forms回答やリスト登録だけでは公開しない |
| 取り下げ | `公開済み` | 本人確認後に `取り下げ` | 匿名の未確認依頼だけでは変更しない |

## SharePoint リスト

サイト名は `PLUG Solutions`、リスト名は `掲載申請` とする。サイトとリストは公開せず、運営者だけが利用する。Power Automate の試作・検証環境は Developer 環境の `みのる環境` に固定する。

| 列 | 種類 | 用途 |
| --- | --- | --- |
| `Title` | 1行テキスト | 作品名 |
| `ResponseId` | 1行テキスト、一意・インデックス | Forms回答の重複防止 |
| `ReviewStatus` | 選択肢 | `未審査／要確認／承認／却下／公開済み／取り下げ` |
| `SubmittedAt` | 日時 | 受付日時 |
| `ConsentAnswer` | 1行テキスト | 申請条件への回答 |
| `MakerDisplayName` | 1行テキスト | 公開用作者表示名 |
| `XHandle` | 1行テキスト | 公開用Xアカウント |
| `Description` | 複数行テキスト | 作品概要 |
| `TypesAndUses` | 複数行テキスト | 種類・主な用途 |
| `DistributionUrl` | 1行テキスト | 配布先・利用先URL |
| `RelatedUrls` | 複数行テキスト | ソース・導入手順など |
| `Requirements` | 複数行テキスト | 利用条件・導入条件 |
| `ThumbnailCandidateUrl` | 1行テキスト | 非公開の画像候補URL |
| `Slug` | 1行テキスト | 審査後に人が設定 |
| `ReviewNotes` | 複数行テキスト | 非公開の審査メモ |
| `ReviewedAt` | 日時 | 審査日時 |
| `PublishedAt` | 日時 | 公開確認日時 |

`ResponseId`、同意回答、審査メモ、画像候補URL、審査日時は公開 JSON に含めない。

## 検証

1. テスト回答1件からSharePoint行が1件だけ作られる。
2. 同じ `ResponseId` を再処理しても行数が増えない。
3. 同意回答が「すべて確認しました」以外なら `要確認` になる。
4. 必須値の欠落、`@` で始まらない X ハンドル、HTTPS でない配布 URL は `要確認` になる。
5. 氏名とメール列がなく、自動取得された個人情報が保存されない。
6. 接続とリストの権限が運営者に限定されている。
7. フロー失敗時にGitHub、公開JSON、本番サイトが変更されない。
8. Forms が返す `responder`（回答者メール）をフローが参照・保存していない。

各フローの有効化前に、運営者が Forms の匿名設定、SharePoint 権限、列対応、テスト結果を確認する。取込フローと公開JSON候補フローは確認後に有効化済み。公開JSON候補は非公開 `Exports` ライブラリまでとする。GitHub ActionsはPower Appsで承認済みの行だけを別途読み取り、公開許可項目と処理済み画像だけのPRを作る。PRの承認・mergeとサイト公開は人が行う。

## 動作確認記録

2026-08-25 に `みのる環境` で個人情報を含まないテスト回答を送信し、次を確認した。

- 初回実行は成功し、SharePoint に `未審査` の行が1件作成された。
- 同じ実行を再送しても作成処理は `Skipped` となり、行は1件のままだった。
- 作品情報、同意回答、受付日時は想定した列へ転記された。
- 回答者メールを保存する列や値は存在しなかった。
- `@` で始まらない X ハンドルを含むテスト回答は `要確認` として保存された。

同日に、個人情報を含まない運営用テスト行で公開JSON候補フローを有効化し、次を確認した。

- `未審査` の更新はフローで検知されたが、JSON組み立てとファイル作成は条件不成立で `Skipped` となり、`Exports` は空のままだった。
- 必須公開項目を補完して `承認` にすると、`Exports/plug-solutions-e2e-test.json` が1件生成された。
- 同じslugで再実行すると同じファイルが上書きされ、ファイル数は1件のままだった。
- 生成JSONは `catalog/schema.json` の検証を通過し、公開19項目だけを含み、公開禁止フィールドは0件だった。
- 取込フローと公開JSON候補フローはいずれも `On` を維持している。

## Solution とソース管理

- 開発環境は Developer 環境の `みのる環境` に固定する。環境IDはリポジトリへ記録しない。
- アンマネージドSolutionは `PLUGSolutions`、表示名は `PLUG Solutions`、versionは `1.0.0.0` とする。
- publisherは `PLUG365`、customization prefixは `plug` とする。
- SolutionにはCloud Flow 2件と、Microsoft Forms／SharePointのconnection reference各1件を含める。
- 取込フローと公開JSON候補フローはいずれも `On`。初回試験後の状態をSolutionソースへ再取得した。
- 2026-08-25にローカルでunpack後のアンマネージド再packを実行し、2本のWorkflowを含むパッケージを正常に生成できることを確認した。検証用ZIPは残さない。
- unpack結果にはtenant固有のSharePoint bindingが含まれるため、`solutions/PLUGSolutions` は現時点ではローカル専用かつGit管理外とする。リポジトリでは `power-platform/flows` のplaceholder-based templateをレビュー用の正本とする。
- full Solutionのソース管理は、connection referenceとdeployment settingsからtenant固有値を排除できる形へ整理した後に行う。

## 承認後の公開JSON候補生成

### 対象と境界

- 人が `承認` にした行だけから、公開スキーマに一致するJSON候補を生成する。
- 出力先は同じ非公開SharePointサイト内のドキュメントライブラリ `Exports` とする。
- ファイル名は `<slug>.json` とし、再実行時は同じファイルを上書きする。
- Power AutomateからGitHub、公開カタログ、本番サイトへは送信しない。GitHub Actionsが承認済み行を読取専用で参照し、運営者が確認できるPRとして取り込む。

### 状態と操作

| 操作 | 許可条件 | 結果 | 拒否・不変条件 |
| --- | --- | --- | --- |
| JSON候補生成 | `ReviewStatus=承認` かつ公開必須項目が入力済み | `Exports/<slug>.json` を作成または上書き | `未審査／要確認／却下／公開済み／取り下げ` は出力しない |
| 再生成 | 同じslugの承認済み行 | 同じファイルだけを上書き | ファイルを増殖させない |
| 入力不備 | 承認済みでも公開必須項目が欠落 | 既存ファイルを変更せず終了 | 不完全なJSONを作らない |
| GitHub取込 | Power Appsで承認済み、公開項目が妥当 | GitHub Actionsが専用branchへ公開JSONと処理済み画像を追加しPRを作成 | フローからcommit・pushしない。`main`へ直接pushしない |

### 審査時に入力する公開項目

既存の `Slug` に加えて、次の列を審査リストへ追加する。複数値は1行に1件で入力し、JSON生成時に配列へ変換する。

| SharePoint列 | 種類 | 公開JSON |
| --- | --- | --- |
| `CatalogType` | 1行テキスト | `type` |
| `CatalogCategories` | 複数行テキスト | `categories` |
| `CatalogTags` | 複数行テキスト | `tags` |
| `SourceUrl` | 1行テキスト | `sourceUrl` |
| `InstructionsUrl` | 1行テキスト | `instructionsUrl` |
| `CatalogLicense` | 1行テキスト | `license` |
| `CatalogCost` | 1行テキスト | `cost` |
| `PremiumRequired` | 選択肢 | `必要／不要／不明` を `true／false／null` へ変換 |
| `SetupTime` | 1行テキスト | `setupTime` |
| `CatalogPrerequisites` | 複数行テキスト | `prerequisites` |
| `ThumbnailPath` | 1行テキスト | `thumbnail`。未入力は `null` |
| `CatalogPublishedDate` | 日付 | `publishedAt` |
| `CatalogUpdatedDate` | 日付 | `updatedAt` |

JSONは公開許可リストで組み立て、`ResponseId`、`ConsentAnswer`、`ReviewNotes`、`ThumbnailCandidateUrl`、受付・審査日時、回答者メールを含めない。

### 検証項目

1. `承認` 以外の変更ではファイルが作成・更新されない。
2. 承認済みでもslug、分類、ライセンス、費用、導入時間、公開日などの必須値が欠けていれば出力しない。
3. 同じslugを再処理しても `Exports` 内のJSONは1ファイルのままである。
4. JSON候補が `catalog/schema.json` とローカル検証を通る。
5. 公開禁止フィールドと回答者メールがJSON文字列に含まれない。
6. SharePoint障害や部分失敗時にGitHubと本番サイトが変更されない。

### ローカル取込（自動化停止時のフォールバック）

運営者は非公開 `Exports` から確認済みJSONをダウンロードし、最初に書き込みなしで検証する。

```powershell
npm run import:solution -- --input "<downloaded-json>"
```

表示されたslugと保存先を確認した後、`--write` を付けて新規レコードを作成する。既存slugは既定で拒否し、人が既存レコードとの差分を確認した場合だけ `--write --replace` を使用する。公開禁止フィールド、不正なURL・日付・slug、未処理または存在しないサムネイルは取込前に拒否する。取込後もcommit・push・本番公開は自動実行しない。
