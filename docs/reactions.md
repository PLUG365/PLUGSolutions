# リアクションAPI

リアクションは Microsoft Forms では受け付けず、Cloudflare Workers Free＋D1 Free の小さなAPIで処理する。作品ページの初期表示は `catalog/reactions.json` を使い、APIが設定されている場合だけライブ集計へ更新する。

## 公開API

`GET /v1/reactions/:slug` は、次の3種の集計値だけを返す。

```json
{"slug":"decision-flow","counts":{"interested":0,"tried":0,"adopted":0}}
```

`POST /v1/reactions/:slug` のbodyは次の形とする。

```json
{"reactionType":"interested","visitorToken":"<ブラウザ内で生成したランダム値>"}
```

`reactionType` は `interested`、`tried`、`adopted` のいずれか。WorkerはtokenをSHA-256化してからD1へ保存し、raw token、IP、氏名、メール、Xアカウント、回答時刻は保存しない。D1の一意制約で同一ブラウザ・作品・種別の再送を無変更として扱い、UTC日次5,000件を超える新規イベントは拒否する。

## manifest同期

`public/reaction-manifest.json` は `catalog/solutions` から `npm run generate:reaction-manifest` で生成する。Workerの30分cronが `CATALOG_MANIFEST_URL` を取得して `solution_slugs` をactive状態へ同期する。manifestにないslug、無効なslug、D1障害は公開データを返さずfail-closedとする。

## 初回設定（人手ゲート）

1. CloudflareにD1データベースを作り、`worker/migrations/0001_reactions.sql` を適用する。
2. `worker/wrangler.toml` の `database_id`、固定 `ALLOWED_ORIGIN`、公開サイトの `CATALOG_MANIFEST_URL` を確認する。初期設定は無料の `workers.dev` エンドポイントで、公開ホスト名が決まったら `NEXT_PUBLIC_REACTIONS_API_URL` と `public/staticwebapp.config.json` の `connect-src` を同じホストへ更新する。
3. `NEXT_PUBLIC_REACTIONS_API_URL` をAzure Static Web Appsのproduction変数へ登録する。
4. Cloudflareのデプロイworkflowを手動実行する。workflowはmigration後にmanifestをD1へ初回seedし、以後30分cronで同期する。production tokenまたはaccount IDが無い場合はworkflowがskip noticeで終了し、Workerを更新しない。

Cloudflareリソース作成、D1データ投入、workflow有効化はリポジトリ変更だけでは実施されない。production反映前に管理者が料金、保持、CORS origin、D1権限を確認する。
