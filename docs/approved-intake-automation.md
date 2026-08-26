# 承認済み申請のGitHub取込自動化

## 目的

Power Appsで人が `承認` にした掲載申請を、GitHub ActionsがSharePointから読み取り、公開JSONと処理済みサムネイルを専用ブランチへ追加してPull Requestを作成する。`main` への反映と本番公開は自動化しない。

Business BasicのPower Automate Premium HTTPアクションや、長期クライアントシークレットは使用しない。GitHub ActionsはMicrosoft Entra IDのOIDCフェデレーションで短時間トークンを取得し、`掲載申請` リストだけに付与した読取権限を使用する。

## 状態と操作

| 操作 | 許可条件 | 結果 | 拒否・不変条件 |
| --- | --- | --- | --- |
| SharePoint読取 | `ReviewStatus=承認` | 公開候補の検証へ進む | 未審査、要確認、却下、公開済み、取り下げは処理しない |
| 公開項目検証 | 公開必須項目と形式が妥当 | 公開許可項目だけでJSONを構築 | 回答ID、同意、審査メモ、画像候補URLをJSONやログへ出さない |
| 画像取得 | HTTPS、資格情報なし、公開IP、10MB以下、PNG/JPEG/WebP | 一時領域へ取得 | localhost、プライベート／リンクローカルIP、危険なリダイレクト、過大・不正形式を拒否 |
| 画像処理 | Sharpで読取可能、25MP以下 | 1200×675 WebPへ再エンコードし、メタデータを除去 | 生画像はリポジトリへ保存しない。失敗時は文字サムネイルへフォールバックする |
| GitHub反映 | カタログと自動化ブランチに同じslugがない | `automation/catalog-<slug>` へcommitしPRを作成 | `main`へ直接pushしない。本番デプロイを起動しない |
| 再実行 | 未処理の承認済みslug | 最大1件を処理 | 既存カタログ、既存自動化ブランチはスキップし、重複PRを作らない |

## 権限境界

- EntraアプリにはMicrosoft GraphのApplication permission `Lists.SelectedOperations.Selected` だけを管理者同意する。
- `POST /sites/{siteId}/lists/{listId}/permissions` で `掲載申請` リストに `read` だけを割り当てる。権限割当て前のアプリはデータへアクセスできない。
- GitHubのOIDCフェデレーション資格情報は `PLUG365/PLUGSolutions` の `main` ブランチだけをsubjectにする。
- Workflowは `id-token: write`、`contents: write`、`pull-requests: write` だけを持つ。
- SharePointへの書戻し、Forms回答の変更、PR承認、PRマージ、Azure本番公開は行わない。

## GitHub変数

Repository variablesとして次を設定する。IDは認証秘密ではないが、リポジトリへ値を直書きしない。

| 変数 | 内容 |
| --- | --- |
| `AZURE_CLIENT_ID` | OIDCフェデレーションを設定したEntraアプリのclient ID |
| `AZURE_TENANT_ID` | Microsoft 365 tenant ID |
| `AZURE_SUBSCRIPTION_ID` | `azure/login`で使用するAzure subscription ID |
| `PLUG_SHAREPOINT_SITE_ID` | PLUG Solutions SharePoint site ID |
| `PLUG_SUBMISSIONS_LIST_ID` | `掲載申請` list ID |

GitHubリポジトリ設定では、ActionsによるPull Request作成を許可する。`main`のbranch protectionとCODEOWNERSによる人の承認は維持する。

## 構成記録（2026-08-26）

- Entra app: `PLUG Solutions GitHub Intake`
- Microsoft Graph application permission: `Lists.SelectedOperations.Selected` 1件
- OIDC subject: `repo:PLUG365/PLUGSolutions:ref:refs/heads/main`
- list permission: `read`
- GitHub Repository variables: 必要な5件を登録済み
- GitHub Actionsの既定Workflow権限: `read`
- ActionsによるPR作成・承認の許可: `PLUG365` Organizationと `PLUGSolutions` repositoryの両方で有効。既定Workflow権限は `read` のまま維持。設定変更時だけGitHub CLIへ一時的に `admin:org` scopeを追加し、変更と再読取確認後に削除済み。

クライアントシークレットは作成していない。OIDC、Graph権限、対象リスト権限は実環境から再読取し、上記の構成であることを確認済み。tenant ID、client ID、site ID、list IDはGitHub Repository variablesと各クラウド設定にだけ保持し、リポジトリには記録しない。

## 失敗と再試行

- Graph認証、SharePoint読取、公開項目検証に失敗した場合はファイル、branch、PRを作らず失敗終了する。
- 画像だけが未入力または処理失敗の場合は `thumbnail: null` とし、PR本文へフォールバックを明示する。候補URLやレスポンス本文は記載しない。
- 一度に処理する新規slugは最大1件とし、次回の定期実行で残りを処理する。
- 自動化branchが既に存在する場合は変更せず終了し、人が既存PRを解決する。

## 機械ゲート

1. 未承認行が処理対象にならない。
2. 公開JSONがschema検証を通り、非公開列を含まない。
3. HTTP、資格情報付きURL、localhost、プライベート／リンクローカルIPを拒否する。
4. 10MB・25MP・画像形式制限とメタデータ除去を維持する。
5. 既存slugと既存自動化branchで重複を防止する。
6. Workflowが定期実行と手動実行だけで、`main`への直接反映や本番デプロイを含まない。

## 人による確認

- Entra管理者がApplication permission、対象リスト、`read` roleを確認する。
- GitHub管理者がOIDC subject、Workflow権限、ActionsのPR作成設定を確認する。
- PRで作品情報、リンク、ライセンス、画像内容、フォールバック有無、CI結果を確認してから承認・mergeする。
