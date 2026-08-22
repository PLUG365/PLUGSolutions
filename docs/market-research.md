# ソリューションカタログ市場調査

調査日: 2026-08-23

## 結論

「個人開発アプリを投稿して、発見・応援してもらう」だけの市場は既に競合が多い。特に国内でも AppVillage、個人dev、Tsukutta、AppRoom が存在し、海外には Product Hunt、Uneed、Microlaunch など強いローンチ系サービスがある。

一方、次の条件を同時に満たすサービスは見当たらない。

- Web・モバイルの個人開発アプリと、Power Apps、Power Automate、Copilot Studio、PCF、Dataverse を横断して探せる
- 「見る・試す」だけでなく、ソース、テンプレート、ソリューション zip、導入手順などを実際に持ち帰れる
- ライセンス、必要コネクタ、Premium 要否、管理者権限、データソース、対応言語、更新状況を比較できる
- 導入できた人の報告、質問、改善版・派生版を元作品に紐づけられる

したがって、勝ち筋は汎用的な「日本版 Product Hunt」ではなく、**持ち帰って使えることに特化した、コード／ローコード横断の Solution Commons** である。

## 市場の追い風

- GitHub は 2025 年に 3,600 万人超の開発者が新規参加し、毎分約 230 のリポジトリが作成されたと報告している。LLM SDK を使う公開リポジトリは 110 万超で、AI による制作量の増加は明確。
- Stripe Atlas では 2025 年創業者の 42% が AI 関連を構築しており、20% が設立後 30 日以内に初回課金へ到達した。小規模チームが短期間で出荷する流れが強い。
- Power Platform には公式サンプル、Creator Kit、PCF Gallery、個人のテンプレート販売などがあるが、資産が複数の場所に分散している。

このため供給量は増えているが、利用者側の「何が安全に再利用できるか」「自分の環境で動くか」を判断する負担も増えている。

## 競合マップ

| 領域 | 主なサービス | 強い点 | 本構想に残る余地 |
|---|---|---|---|
| 世界の新作発見 | Product Hunt | 大きな初期利用者層、投票、コメント、日次ランキング | ローンチ日に集中。導入前提、成果物、派生関係は主役ではない |
| インディー向けローンチ | Uneed / Microlaunch | 小規模開発者に参加しやすいランキング、継続露出、特典 | SaaS・Web 製品中心。業務ソリューションの導入情報が弱い |
| 国内の個人開発発見 | AppVillage | 14 カテゴリ、検索、お気に入り、コメント、作者の物語 | アプリ利用・応援が中心。Power Platform 資産の import や再利用条件までは扱わない |
| 国内の開発者交流 | 個人dev | アプリ告知、開発者検索、交流 | 掲載・宣伝が中心。再利用の品質・導入実績を比較しにくい |
| 国内の投稿型一覧 | Tsukutta / AppRoom | 気軽な投稿、新着発見、外部送客 | カタログ情報と導入支援が浅い |
| Power Platform 公式サンプル | Microsoft PowerApps-Samples / Teams sample apps / Creator Kit | 公式性、技術資料、サンプル品質 | GitHub・Learn・Maker portal に分散。作品発見や作者交流の体験は弱い |
| Power Platform コミュニティ資産 | PCF Gallery / Power Apps UI | コンポーネントを探して再利用できる | 対象が PCF または Canvas 部品に限定。完全な業務ソリューションを横断しない |
| Power Apps 有料テンプレート | Power Apps Template Marketplace など | 完成テンプレートを購入・ダウンロードできる | 商用カタログ寄り。オープンな派生・交流・導入知識の蓄積が弱い |
| エンタープライズ製品流通 | Microsoft AppSource | 信頼、正式な取引、企業導入 | 掲載ハードルが高く、個人作品や実験的サンプルには重い |

## 競合から学ぶべきこと

### 1. 「応援」だけでは差別化にならない

投票、いいね、コメント、ランキングは多くの競合が既に備えている。初期版で同じ機能を揃えても、ネットワーク効果で先行サービスに勝ちにくい。

### 2. ローンチより継続利用の証拠が価値になる

Product Hunt 型は新着性が強い。一方、本構想では以下を評価軸にすると異なる価値を作れる。

- 「導入できた」件数
- 最終動作確認日
- セットアップ所要時間
- 必要ライセンスと概算コスト
- 利用者が追加した手順・つまずき
- 元作品からの派生数

### 3. Power Platform では信頼情報そのものがプロダクトになる

Power Platform の成果物は、外見が良くても Premium connector、Dataverse、環境変数、接続参照、管理者権限などで導入難度が大きく変わる。ここを構造化すれば、単なるギャラリーより強い検索価値を作れる。

### 4. 「交流」は作品単位にする

汎用タイムラインを作るより、各作品に次を紐づける方が利用目的が明確になる。

- 導入 Q&A
- 活用事例
- 改善リクエスト
- 派生・翻訳・業種別カスタマイズ
- 作者の更新ノート

## 推奨するポジショニング

> 使えるアイデアを見つけて、試して、持ち帰って、自分の現場に育てる場所。

対象は「完成した商用アプリ」だけでなく、再利用可能な最小単位まで含める。

- 個人開発 Web / iOS / Android / Desktop アプリ
- OSS、スターター、ボイラープレート
- Power Apps Canvas / Model-driven / Custom page
- Power Automate flow
- Copilot Studio agent / topic / action
- Dataverse solution
- PCF / Canvas component
- テンプレート、プロンプト、デザインシステム

ただし一覧では技術名より、利用者の目的を先に見せる。「経費精算」「問い合わせ対応」「学習」「家計」「在庫」などの課題カテゴリを主軸にし、技術は絞り込み条件にする。

## 初期ユーザー

1. **Maker**: 作ったものを届けたい。利用者の反応や改善材料がほしい。
2. **Adopter**: ゼロから作らず、すぐ試せる土台を探したい。
3. **Remixer**: 既存資産を改良・翻訳・別業種向けに展開したい。
4. **Power Platform Champion**: 社内で安全に紹介できるサンプルや部品を探したい。

初期は 1 と 2 に絞り、3 は派生リンクで軽く支援する。4 は将来の有料プラン候補。

## MVP で必要なもの

### 必須

- 課題・技術・利用条件による検索と絞り込み
- 作品ページ: 概要、画面、作者、更新日、対応環境
- CTA の明確な分離: 「試す」「入手する」「ソースを見る」
- 持ち帰り情報: ライセンス、前提条件、導入手順、所要時間、成果物形式
- 作品単位の質問と導入報告
- 作者による更新ノート

### 後回し

- 汎用 SNS タイムライン
- 複雑なポイント・バッジ制度
- サイト内ファイル販売と決済
- ファイルの直接ホスティング
- 組織向け非公開カタログ
- AI による自動審査

最初は GitHub、App Store、Microsoft AppSource、配布ページへの外部リンクで成立させ、保管・決済・セキュリティ責任を増やさない。

## 最初の検証仮説

### 仮説 A: 投稿者は追加の掲載先を欲しがる

検証: 10 人の作者に、既存掲載先、投稿にかけられる時間、欲しい反応を聞く。最低 5 人がサンプル作品の掲載に同意すること。

### 仮説 B: 導入情報が検索理由になる

検証: 作品カードに「無料」「5 分で導入」「Premium 不要」「日本語」「商用利用可」を表示し、通常の人気順より絞り込みが使われるか測る。

### 仮説 C: 交流はコメント数より導入成功につながる

検証: 「いいね」ではなく「導入できた」「質問する」「派生版を登録」を主要アクションにし、作品閲覧から持ち帰りクリック、導入報告までを計測する。

## 北極星指標

**月間の導入成功数** = 「入手する」クリック後、導入できたと報告されたユニーク件数。

補助指標:

- 作品詳細 → 持ち帰りクリック率
- 初回質問への作者回答率と回答時間
- 30 / 90 日以内の作品更新率
- 1 作品あたりの導入報告数
- 派生作品の登録数

閲覧数やいいね数だけを主指標にすると、既存のローンチサイトと同じ競争になる。

## 収益化の順序

1. 無料掲載・無料閲覧で供給と利用実績を作る
2. 作者向け Pro: 詳細分析、更新通知、追加メディア、優先レビュー
3. 品質確認済みの有料テンプレートに対する取引手数料
4. 組織向け Private Catalog: 承認済み資産、社内評価、ガバナンス情報

スポンサー枠は可能だが、検索順位と広告を混ぜると信頼を損ないやすい。広告は明示された別枠にする。

## リスク

- **供給不足**: 広いカテゴリを掲げるほど空に見える。ローンチ時は 30〜50 件を運営側で選定して掲載する。
- **品質・安全性**: 外部成果物は安全を保証できない。作者申告、ライセンス表示、権限チェック、通報導線を持つ。
- **Power Platform の導入差**: テナントやライセンス差が大きい。環境要件を構造化し、動作保証と区別する。
- **交流の閑散化**: 全体 SNS を作らず、質問・導入報告・派生登録に限定して密度を上げる。
- **競合の模倣**: 掲載件数ではなく、導入成功データと派生グラフを蓄積する。

## 推奨する次の一手

1. 「持ち帰れる」を中心にしたカタログ画面と作品詳細の試作を作る。
2. Power Platform 5 件、Web / モバイル 5 件の計 10 件を実データに近い形で掲載する。
3. Maker 5 人、Adopter 5 人に見せ、検索項目と導入情報の不足を確認する。
4. 反応が良ければ、投稿・ログイン・コメントより先に、外部リンク型の掲載申請フローを実装する。

## 主な参照先

- [GitHub Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)
- [Stripe Atlas startups in 2025](https://stripe.com/blog/stripe-atlas-startups-in-2025-year-in-review)
- [Product Hunt Launch Guide](https://www.producthunt.com/launch)
- [Uneed: How it works](https://www.uneed.best/how-it-works)
- [Microlaunch](https://microlaunch.net/)
- [AppVillage](https://www.app-village.jp/)
- [個人dev](https://kojin.dev/)
- [Tsukutta](https://tsukutta.app/)
- [Microsoft PowerApps-Samples](https://github.com/microsoft/PowerApps-Samples)
- [Power Apps sample app templates](https://learn.microsoft.com/en-us/power-apps/teams/use-sample-apps-from-teams-store)
- [Creator Kit](https://learn.microsoft.com/en-us/power-platform/guidance/creator-kit/overview)
- [PCF Gallery](https://pcf.gallery/about)
- [Power Apps UI](https://www.powerappsui.com/)
