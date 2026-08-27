# 掲載・取り下げのGitHubカタログ同期

## 目的

Power Appsで人が `承認` または `取り下げ` にした掲載申請を、GitHub ActionsがSharePointから読み取る。承認時は公開JSONと処理済みサムネイルの追加PR、取り下げ時は既存JSONと対応サムネイルだけを除去するPRを作成する。`main` への反映と本番公開は自動化しない。

Business BasicのPower Automate Premium HTTPアクションや、長期クライアントシークレットは使用しない。GitHub ActionsはMicrosoft Entra IDのOIDCフェデレーションで短時間トークンを取得し、`掲載申請` リストだけに付与した読取権限を使用する。

## 状態と操作

| 操作 | 許可条件 | 結果 | 拒否・不変条件 |
| --- | --- | --- | --- |
| SharePoint読取 | `ReviewStatus=承認` | 公開候補の検証へ進む | 未審査、要確認、却下、公開済み、取り下げは処理しない |
| 取り下げ読取 | `ReviewStatus=取り下げ` かつmainに同じslugが存在 | JSONと同一slugのWebPだけを削除候補にする | 履歴、SharePoint行、他slugのファイルは削除しない |
| 公開項目検証 | Forms原文を正規化し、必須値・形式が妥当 | 公開許可項目だけでJSONを構築 | 回答ID、同意、審査メモ、画像候補URLをJSONやログへ出さない |
| 承認後の再編集 | `ReviewStatus=承認` かつSharePointの`Modified`と状態が選択時から不変 | 公開項目を変更せず`要確認`へ戻す | 承認中の公開項目は読取専用。審査メモは保持する |
| 画像取得 | HTTPS、資格情報なし、公開IP、10MB以下、PNG/JPEG/WebP | 一時領域へ取得 | localhost、プライベート／リンクローカルIP、危険なリダイレクト、過大・不正形式を拒否 |
| 画像処理 | Sharpで読取可能、25MP以下 | 1200×675 WebPへ再エンコードし、メタデータを除去 | 生画像はリポジトリへ保存しない。失敗時は文字サムネイルへフォールバックする |
| GitHub反映 | カタログと自動化ブランチに同じslugがなく、直前の再読取でitem ID・status・slug・eTag・更新日時が初回読取と一致 | `automation/catalog-<slug>` へcommitしPRを作成 | 不一致、行消失、再読取失敗ではbranch・push・PRを作らない。`main`へ直接pushせず、本番デプロイを起動しない |
| 再実行 | 未処理の承認済みslug | 最大1件を処理 | 既存カタログ、既存自動化ブランチはスキップし、重複PRを作らない |
| 取り下げ再実行 | 既存の削除branchがある | 変更せず終了 | 重複する削除PRを作らない |

## 権限境界

- EntraアプリにはMicrosoft GraphのApplication permission `Lists.SelectedOperations.Selected` だけを管理者同意する。
- `POST /sites/{siteId}/lists/{listId}/permissions` で `掲載申請` リストに `read` だけを割り当てる。権限割当て前のアプリはデータへアクセスできない。
- GitHubのOIDCフェデレーション資格情報は `PLUG365/PLUGSolutions` の `main` ブランチだけをsubjectにする。
- Workflowは `id-token: write`、`contents: write`、`pull-requests: write` だけを持つ。
- SharePointへの書戻し、Forms回答や審査履歴の削除、PR承認、PRマージ、Azure本番公開は行わない。
- GitHub Actionsは初回読取のitem ID、状態、slug、eTag、更新日時を一時結果へ保持し、commit直前に同じ行をGETで再読取する。再確認にも書込権限は使わない。

## GitHub変数

Repository variablesとして次を設定する。IDは認証秘密ではないが、リポジトリへ値を直書きしない。

| 変数 | 内容 |
| --- | --- |
| `AZURE_CLIENT_ID` | OIDCフェデレーションを設定したEntraアプリのclient ID |
| `AZURE_TENANT_ID` | Microsoft 365 tenant ID |
| `PLUG_SHAREPOINT_SITE_ID` | PLUG Solutions SharePoint site ID |
| `PLUG_SUBMISSIONS_LIST_ID` | `掲載申請` list ID |

`azure/login` は `allow-no-subscriptions: true` でテナントレベル認証だけを行う。EntraアプリへAzure Subscription RBACを付与しない。

GitHubリポジトリ設定では、ActionsによるPull Request作成を許可する。`main`のbranch protectionとCODEOWNERSによる人の承認は維持する。`GITHUB_TOKEN`が作成・更新したPRの`pull_request` WorkflowはGitHubの再帰実行防止により`action_required`となるため、変更内容を確認した運営者がPRの **Approve workflows to run** でCIを開始する。CIの自動開始だけを目的にPATや長期シークレットへ置き換えない。

## 構成記録（2026-08-26）

- Entra app: `PLUG Solutions GitHub Intake`
- Microsoft Graph application permission: `Lists.SelectedOperations.Selected` 1件
- OIDC subject: GitHubのimmutable subject形式で `PLUG365/PLUGSolutions` の `main` に限定
- list permission: `read`
- GitHub Repository variables: 必要な4件を登録済み。Azure subscription IDは使用しない
- GitHub Actionsの既定Workflow権限: `read`
- ActionsによるPR作成・承認の許可: `PLUG365` Organizationと `PLUGSolutions` repositoryの両方で有効。既定Workflow権限は `read` のまま維持。設定変更時だけGitHub CLIへ一時的に `admin:org` scopeを追加し、変更と再読取確認後に削除済み。

クライアントシークレットは作成していない。OIDC、Graph権限、対象リスト権限は実環境から再読取し、上記の構成であることを確認済み。tenant ID、client ID、site ID、list IDはGitHub Repository variablesと各クラウド設定にだけ保持し、リポジトリには記録しない。

## 失敗と再試行

- Graph認証、SharePoint読取、公開項目検証に失敗した場合はファイル、branch、PRを作らず失敗終了する。
- 検証後からcommit直前までにSharePoint行の状態または版が変わった場合は、再読取で検知してbranch、push、PRを作らず終了する。
- 取り下げslug、公開JSON、サムネイル参照が一致しない場合は何も削除せず失敗終了する。
- 画像だけが未入力または処理失敗の場合は `thumbnail: null` とし、PR本文へフォールバックを明示する。候補URLやレスポンス本文は記載しない。
- 一度に処理する新規slugは最大1件とし、次回の定期実行で残りを処理する。
- 自動化branchが既に存在する場合は変更せず終了し、人が既存PRを解決する。
- 掲載・取り下げPRのCIが`action_required`の場合は異常終了ではない。PR差分にWorkflow変更や非公開情報がないことを確認してから、書込権限を持つ運営者がCI実行を許可する。
- commit直前の再読取が成功した後からbranch作成、push、PR作成までにSharePoint行が変わる競合窓は残る。この間の変更は同じrunでは検出できず、作成済みPRも自動失効しないため、merge前にPR記載のSharePoint itemと受理した更新日時を現在行と人が照合する。将来はmerge-timeの読取専用再検証を追加候補とする。

## 機械ゲート

1. 未承認行が処理対象にならない。
2. 公開JSONがschema検証を通り、非公開列を含まない。
3. HTTP、資格情報付きURL、localhost、プライベート／リンクローカルIPを拒否する。
4. 10MB・25MP・画像形式制限とメタデータ除去を維持する。
5. 既存slugと既存自動化branchで重複を防止する。
6. Workflowが定期実行と手動実行だけで、`main`への直接反映や本番デプロイを含まない。
7. `公開済み` 以外から直接 `取り下げ` にできず、取り下げ理由が空なら状態を変更しない。
8. `取り下げ` 行では同じslugのJSONと対応WebPだけが削除候補になり、SharePoint行と他作品は残る。
9. 初回読取とcommit直前の再読取を別々に模擬し、状態、eTag、更新日時、slug、item IDのいずれかが変われば処理を拒否する。
10. GitHub側のSharePointアクセスがGETだけで、create、update、patch、deleteを含まない。

## 画像E2E

- 画像なし申請では文字サムネイルへフォールバックする。
- 画像あり申請では、再配布条件が不明確な第三者素材を使わず、PLUGが権利を持つロゴの公開GitHub URLを候補URLとして使う。
- PNG取得、public DNS／HTTPS検査、10MB制限、1200×675 WebP再エンコード、メタデータ除去、掲載PRへの追加を確認する。
- 取り下げPRでJSONと同一slugの処理済みWebPが同時に除去されることを確認する。

## 人による確認

- Entra管理者がApplication permission、対象リスト、`read` roleを確認する。
- GitHub管理者がOIDC subject、Workflow権限、ActionsのPR作成設定を確認する。
- PRで作品情報、リンク、ライセンス、画像内容、フォールバック有無、CI結果を確認してから承認・mergeする。
- PRに記録されたSharePoint item IDと受理した更新日時が、現在の審査行と一致し、状態が掲載PRなら`承認`、削除PRなら`取り下げ`のままであることをmerge直前に確認する。
