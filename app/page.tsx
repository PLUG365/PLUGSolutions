"use client";

import { useEffect, useMemo, useState } from "react";

type Solution = {
  title: string;
  maker: string;
  type: string;
  description: string;
  categories: string[];
  tags: string[];
  color: string;
  mark: string;
  setup: string;
  cost: string;
  adoption: number;
  premium: boolean;
  updated: string;
  license: string;
  deliverable: string;
  prerequisites: string;
};

const solutions: Solution[] = [
  {
    title: "経費スナップ",
    maker: "Haru / Power Maker",
    type: "Canvas App",
    description: "レシートを撮って申請。小さなチーム向けの、迷わない経費精算アプリ。",
    categories: ["Power Platform", "業務テンプレート"],
    tags: ["経費精算", "SharePoint", "日本語"],
    color: "coral",
    mark: "領",
    setup: "約 5 分",
    cost: "無料",
    adoption: 48,
    premium: false,
    updated: "3日前",
    license: "MIT / 商用利用可",
    deliverable: "unmanaged solution (.zip)",
    prerequisites: "Microsoft 365、SharePoint リスト作成権限",
  },
  {
    title: "Flow Triage",
    maker: "Nami Works",
    type: "Power Automate",
    description: "共有メールの問い合わせを分類し、担当チームへ自動で振り分けます。",
    categories: ["Power Platform", "業務テンプレート"],
    tags: ["問い合わせ", "Outlook", "Teams"],
    color: "blue",
    mark: "流",
    setup: "約 10 分",
    cost: "無料",
    adoption: 31,
    premium: false,
    updated: "1週間前",
    license: "CC BY 4.0",
    deliverable: "Power Automate package (.zip)",
    prerequisites: "Outlook、Teams の標準コネクタ",
  },
  {
    title: "Kakeibo Lens",
    maker: "mono labs",
    type: "Web App / OSS",
    description: "CSV を読み込むだけで、家計の変化をやさしい言葉と図で振り返れる。",
    categories: ["Web / モバイル", "OSS"],
    tags: ["家計", "ローカル処理", "TypeScript"],
    color: "lime",
    mark: "家",
    setup: "すぐ試せる",
    cost: "OSS",
    adoption: 76,
    premium: false,
    updated: "昨日",
    license: "Apache-2.0 / 商用利用可",
    deliverable: "GitHub repository / Web demo",
    prerequisites: "ブラウザのみ。データは端末内で処理",
  },
  {
    title: "Field Log",
    maker: "TOPO Studio",
    type: "Canvas + Dataverse",
    description: "現場点検、写真、是正依頼をオフラインでも一つの流れにまとめます。",
    categories: ["Power Platform", "業務テンプレート"],
    tags: ["点検", "Dataverse", "オフライン"],
    color: "purple",
    mark: "現",
    setup: "約 25 分",
    cost: "無料",
    adoption: 19,
    premium: true,
    updated: "2週間前",
    license: "MIT / 商用利用可",
    deliverable: "managed / unmanaged solution",
    prerequisites: "Dataverse、Power Apps Premium、環境管理者の承認",
  },
  {
    title: "余白日記",
    maker: "suzume apps",
    type: "iOS App",
    description: "一日ひとこと。書かなかった日も責めない、静かな日記アプリです。",
    categories: ["Web / モバイル"],
    tags: ["日記", "iCloud", "日本語"],
    color: "sand",
    mark: "日",
    setup: "App Store",
    cost: "無料",
    adoption: 112,
    premium: false,
    updated: "5日前",
    license: "無料アプリ",
    deliverable: "App Store distribution",
    prerequisites: "iOS 18 以降",
  },
  {
    title: "FAQ Copilot Starter",
    maker: "Aki Automates",
    type: "Copilot Studio",
    description: "社内 FAQ を小さく始めるためのトピック、評価セット、運用チェックリスト。",
    categories: ["Power Platform", "OSS"],
    tags: ["社内FAQ", "Copilot", "評価"],
    color: "aqua",
    mark: "答",
    setup: "約 15 分",
    cost: "無料",
    adoption: 27,
    premium: true,
    updated: "4日前",
    license: "MIT / 商用利用可",
    deliverable: "agent YAML / evaluation CSV",
    prerequisites: "Copilot Studio ライセンス、作成者ロール",
  },
];

const filters = ["すべて", "Power Platform", "Web / モバイル", "業務テンプレート", "OSS"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("すべて");
  const [selected, setSelected] = useState<Solution | null>(null);

  const visibleSolutions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return solutions.filter((solution) => {
      const matchesFilter = filter === "すべて" || solution.categories.includes(filter);
      const haystack = [
        solution.title,
        solution.maker,
        solution.type,
        solution.description,
        ...solution.tags,
      ]
        .join(" ")
        .toLowerCase();
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [filter, query]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Solution Commons ホーム">
          <span className="brand-mark">SC</span>
          <span>SOLUTION<br />COMMONS</span>
        </a>
        <nav aria-label="メインナビゲーション">
          <a href="#catalog">見つける</a>
          <a href="#activity">コミュニティ</a>
          <a href="#about">この場所について</a>
        </nav>
        <a className="header-cta" href="#submit">作品を持ち寄る <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> 個人開発 × Power Platform</p>
          <h1>いい解決策は、<br /><em>持ち帰れる。</em></h1>
          <p className="hero-lead">
            つくった人の工夫を、使いたい人の現場へ。<br />
            アプリ、フロー、コンポーネントを見つけて、試して、育てるコモンズ。
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#catalog">解決策を探す <span aria-hidden="true">↓</span></a>
            <a className="text-button" href="#about">仕組みを見る <span aria-hidden="true">→</span></a>
          </div>
          <div className="trust-row" aria-label="カタログの特徴">
            <span>✓ 導入条件を明記</span>
            <span>✓ 商用利用を確認</span>
            <span>✓ 作者に質問できる</span>
          </div>
        </div>

        <aside className="featured-card" aria-label="今週のピックアップ">
          <div className="featured-topline">
            <span>THIS WEEK&apos;S PICK</span>
            <span>01 / 06</span>
          </div>
          <div className="featured-art">
            <span className="orb orb-one" />
            <span className="orb orb-two" />
            <span className="receipt-sheet">
              <i /> <i /> <i />
              <b>¥ 8,420</b>
            </span>
          </div>
          <div className="featured-meta">
            <span className="type-pill">CANVAS APP</span>
            <span className="verified">● VERIFIED MAKER</span>
          </div>
          <h2>経費スナップ</h2>
          <p>レシートを撮って、そのまま申請。小さなチームにちょうどいい経費精算。</p>
          <div className="featured-facts">
            <span><small>SETUP</small>約 5 分</span>
            <span><small>LICENSE</small>MIT</span>
            <span><small>ADOPTED</small>48 回</span>
          </div>
          <button type="button" onClick={() => setSelected(solutions[0])}>中身を見てみる <span aria-hidden="true">↗</span></button>
        </aside>
      </section>

      <section className="signal-strip" aria-label="現在のコミュニティ状況">
        <p><strong>126</strong><span>持ち帰れる作品</span></p>
        <p><strong>38</strong><span>今月の導入成功</span></p>
        <p><strong>72</strong><span>参加している Maker</span></p>
        <p className="live-signal"><i /> 今日も 4 人が試しています</p>
      </section>

      <section className="catalog" id="catalog">
        <div className="section-heading">
          <div>
            <p className="section-index">01 — EXPLORE</p>
            <h2>あなたの次の<br />「使える」を探す</h2>
          </div>
          <p>人気より、使える条件で選ぶ。<br />ライセンスも前提環境も、ひと目で。</p>
        </div>

        <div className="catalog-controls">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">作品を検索</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="課題、技術、作品名で検索"
            />
            <kbd>⌘ K</kbd>
          </label>
          <div className="filter-row" aria-label="作品カテゴリ">
            {filters.map((item) => (
              <button
                className={filter === item ? "active" : ""}
                type="button"
                key={item}
                onClick={() => setFilter(item)}
                aria-pressed={filter === item}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="sample-notice"><span>PROTOTYPE</span> 掲載内容は体験確認用のサンプルデータです。</div>

        {visibleSolutions.length ? (
          <div className="solution-grid">
            {visibleSolutions.map((solution) => (
              <article className="solution-card" key={solution.title}>
                <div className={`card-art ${solution.color}`}>
                  <span className="card-number">{String(solutions.indexOf(solution) + 1).padStart(2, "0")}</span>
                  <span className="card-mark">{solution.mark}</span>
                  <span className="art-chip">{solution.type}</span>
                </div>
                <div className="card-body">
                  <div className="card-topline">
                    <span>{solution.type}</span>
                    <span>更新 {solution.updated}</span>
                  </div>
                  <h3>{solution.title}</h3>
                  <p className="maker">by {solution.maker}</p>
                  <p className="card-description">{solution.description}</p>
                  <div className="tag-list">
                    {solution.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <dl className="card-facts">
                    <div><dt>導入</dt><dd>{solution.setup}</dd></div>
                    <div><dt>費用</dt><dd>{solution.cost}</dd></div>
                    <div><dt>Premium</dt><dd>{solution.premium ? "必要" : "不要"}</dd></div>
                  </dl>
                  <div className="card-footer">
                    <span><b>{solution.adoption}</b> 人が導入</span>
                    <button type="button" onClick={() => setSelected(solution)}>詳しく見る <span aria-hidden="true">→</span></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span>0 RESULTS</span>
            <h3>まだ、この組み合わせは空いています。</h3>
            <p>検索語を変えるか、最初の作品を持ち寄ってください。</p>
            <button type="button" onClick={() => { setQuery(""); setFilter("すべて"); }}>条件をリセット</button>
          </div>
        )}
      </section>

      <section className="activity" id="activity">
        <div className="section-heading light">
          <div>
            <p className="section-index">02 — COMMUNITY</p>
            <h2>持ち帰った先の<br />物語が続いていく</h2>
          </div>
          <p>いいねの数より、使えた実感。<br />質問、導入報告、派生版が作品を育てます。</p>
        </div>
        <div className="activity-grid">
          <article className="activity-card accent-card">
            <p className="activity-label">導入できた！</p>
            <blockquote>「経費スナップ」を 8 人のチームで使い始めました。説明なしでも申請できています。</blockquote>
            <footer><span className="avatar">KA</span><p><strong>kaori</strong><small>12 分前 · 経費スナップ</small></p><b>↗</b></footer>
          </article>
          <article className="activity-card">
            <p className="activity-label question">質問</p>
            <blockquote>ゲストユーザーを含む Teams でも、このフローは動きますか？</blockquote>
            <footer><span className="avatar mint">YU</span><p><strong>yuji_m</strong><small>38 分前 · Flow Triage</small></p><b>2 回答</b></footer>
          </article>
          <article className="activity-card">
            <p className="activity-label remix">派生版</p>
            <blockquote>英語版と学校向けカテゴリを追加した「Field Log EDU」を公開しました。</blockquote>
            <footer><span className="avatar violet">AM</span><p><strong>ami</strong><small>2 時間前 · Field Log</small></p><b>↗</b></footer>
          </article>
        </div>
      </section>

      <section className="about" id="about">
        <p className="section-index">03 — HOW IT WORKS</p>
        <div className="about-title">
          <h2>見つけるだけで、<br />終わらせない。</h2>
          <p>作品の魅力と同じくらい、持ち帰るための情報を大切にします。</p>
        </div>
        <ol className="steps">
          <li><span>01</span><h3>見つける</h3><p>やりたいこと、利用環境、費用から自分に合う作品を探す。</p></li>
          <li><span>02</span><h3>確かめる</h3><p>必要ライセンス、導入時間、権限、作者の更新状況を確認する。</p></li>
          <li><span>03</span><h3>持ち帰る</h3><p>デモを試す、ソースを見る、ソリューションを自分の環境へ。</p></li>
          <li><span>04</span><h3>育てる</h3><p>導入報告や質問、派生版を残し、次の利用者へ知恵を渡す。</p></li>
        </ol>
      </section>

      <section className="submit-section" id="submit">
        <div>
          <p className="section-index">BRING YOUR SOLUTION</p>
          <h2>あなたの工夫を、<br />誰かのスタート地点に。</h2>
        </div>
        <div className="submit-copy">
          <p>完成品でなくても構いません。小さなアプリ、便利なフロー、ひとつのコンポーネントから持ち寄れます。</p>
          <button type="button">掲載リクエストを送る <span aria-hidden="true">↗</span></button>
          <small>初期掲載は無料 · GitHub / 配布ページへのリンクで始められます</small>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top"><span className="brand-mark">SC</span><span>SOLUTION<br />COMMONS</span></a>
        <p>つくった人と、使いたい人が出会う場所。</p>
        <div><a href="#catalog">探す</a><a href="#about">この場所について</a><a href="#submit">掲載する</a></div>
        <small>PROTOTYPE · 2026</small>
      </footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <section
            className="detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" type="button" onClick={() => setSelected(null)} aria-label="詳細を閉じる">×</button>
            <div className={`modal-art ${selected.color}`}><span>{selected.mark}</span><small>{selected.type}</small></div>
            <p className="section-index">SOLUTION DETAILS</p>
            <h2 id="detail-title">{selected.title}</h2>
            <p className="modal-maker">by {selected.maker}</p>
            <p className="modal-description">{selected.description}</p>
            <dl className="detail-list">
              <div><dt>持ち帰れるもの</dt><dd>{selected.deliverable}</dd></div>
              <div><dt>ライセンス</dt><dd>{selected.license}</dd></div>
              <div><dt>前提環境</dt><dd>{selected.prerequisites}</dd></div>
              <div><dt>セットアップ</dt><dd>{selected.setup}</dd></div>
            </dl>
            <div className="modal-actions">
              <button type="button">配布ページへ <span aria-hidden="true">↗</span></button>
              <button className="secondary" type="button">作者に質問する</button>
            </div>
            <small className="prototype-note">これは体験確認用のサンプルです。ボタンから外部配布は行いません。</small>
          </section>
        </div>
      )}
    </main>
  );
}
