import Image from "next/image";
import plugLogo from "../assets/完成品(縁あり).png";
import CatalogExplorer from "./CatalogExplorer";
import { getAllSolutions, getReactionCounts } from "../lib/catalog";

const plugGuideUrl = "https://plug365.github.io/PLUGGuide/";
const plugConnpassUrl = "https://plug.connpass.com/";

export default async function Home() {
  const solutions = await getAllSolutions();
  const reactions = await getReactionCounts(solutions);
  const submissionUrl = process.env.NEXT_PUBLIC_SUBMISSION_FORM_URL;

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="PLUG Solutions ホーム">
          <Image className="brand-logo" src={plugLogo} alt="" priority />
          <span>PLUG<br />SOLUTIONS</span>
        </a>
        <nav aria-label="メインナビゲーション">
          <a href="#catalog">見つける</a>
          <a href="#plug">PLUGの考え方</a>
          <a href="#about">参加の流れ</a>
        </nav>
        <a className="header-cta" href="#submit">作品を持ち寄る <span aria-hidden="true">↗</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> A PLUG PROJECT — FIELD-FIRST CATALOG</p>
          <h1><span>解決策をつなぎ、</span><em>現場を起動する。</em></h1>
          <p className="hero-lead">
            Power Platformを起点に、Web、モバイル、AI、OSSまで。<br />
            現場で動いた工夫を、次の誰かが見つけ、持ち帰り、自分の環境で育てるカタログ。
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#catalog">解決策を探す <span aria-hidden="true">↓</span></a>
            <a className="text-button" href="#plug">PLUGを知る <span aria-hidden="true">→</span></a>
          </div>
          <div className="trust-row" aria-label="カタログの特徴">
            <span>✓ 現場起点</span>
            <span>✓ 導入条件を明記</span>
            <span>✓ 技術の越境を歓迎</span>
          </div>
        </div>

        <aside className="featured-card founding-card" aria-label="掲載作品を募集しています">
          <div className="featured-topline">
            <span>FOUNDING COLLECTION</span>
            <span>OPEN CALL</span>
          </div>
          <div className="founding-art">
            <Image src={plugLogo} alt="PLUG — Power Platform Local User Group" priority />
          </div>
          <div className="featured-meta">
            <span className="type-pill">NOW BUILDING</span>
            <span className="verified">● AUTHOR SUBMISSION ONLY</span>
          </div>
          <h2>作品を募集しています</h2>
          <p>完成品でなくても構いません。現場で試したアプリ、フロー、部品、OSSを作者本人から受け付けます。</p>
          <div className="featured-facts">
            <span><small>SIGN-IN</small>不要</span>
            <span><small>LISTING</small>無料</span>
            <span><small>SCOPE</small>技術横断</span>
          </div>
          <a className="featured-link" href="#submit">掲載方法を見る <span aria-hidden="true">↓</span></a>
        </aside>
      </section>

      <section className="signal-strip" aria-label="PLUGが大切にする価値観">
        <p><strong>01</strong><span>現場起点<br />FIELD-FIRST</span></p>
        <p><strong>02</strong><span>実装志向<br />BIAS TO ACTION</span></p>
        <p><strong>03</strong><span>越境歓迎<br />BOUNDARY CROSSING</span></p>
        <p><strong>04</strong><span>学び合い<br />LEARNING TOGETHER</span></p>
        <p><strong>05</strong><span>エンパワメント<br />EMPOWERMENT</span></p>
      </section>

      <section className="catalog" id="catalog">
        <div className="section-heading">
          <div>
            <p className="section-index">01 — EXPLORE</p>
            <h2>あなたの次の<br />「使える」を探す</h2>
          </div>
          <p>人気より、使える条件で選ぶ。<br />ライセンスも前提環境も、ひと目で。</p>
        </div>
        <CatalogExplorer solutions={solutions} reactions={reactions} />
      </section>

      <section className="activity" id="plug">
        <div className="section-heading light">
          <div>
            <p className="section-index">02 — THE PLUG CONCEPT</p>
            <h2>つなぐ。起動する。<br />ギャップを埋める。</h2>
          </div>
          <p>PLUGは、人や組織、ローカルとグローバルをつなぎ、変革・DXを起動し、理想と現実の距離を縮めます。</p>
        </div>
        <div className="plug-mission">
          <p className="activity-label">PLUG MISSION</p>
          <h3>地方企業の現場変革者にPowerを</h3>
          <p>Power Platformを共通言語として、一人で抱え込まず、越境し、学び、実践できる環境をつくる。PLUG Solutionsはその実践知を、技術の境界を越えて循環させます。</p>
        </div>
        <div className="activity-grid plug-grid">
          <article className="activity-card accent-card">
            <p className="activity-label">CONNECT</p>
            <h3>つなぐ</h3>
            <p>つくった人と使いたい人、組織と地域、ローカルな工夫と次の現場をつなぎます。</p>
          </article>
          <article className="activity-card">
            <p className="activity-label question">POWER ON</p>
            <h3>起動する</h3>
            <p>完璧さを待つより、まず動かす。試した事実と小さな実装を、次の変革の電源にします。</p>
          </article>
          <article className="activity-card">
            <p className="activity-label remix">BRIDGE THE GAP</p>
            <h3>ギャップを埋める</h3>
            <p>流行や理論だけでなく、現場の課題、制約、文脈から理想までの現実的な道筋を共有します。</p>
          </article>
        </div>
        <div className="plug-links">
          <a className="plug-guide-link" href={plugGuideUrl} target="_blank" rel="noreferrer">Mission・Vision・Valuesを読む <span aria-hidden="true">↗</span></a>
          <a className="plug-guide-link" href={plugConnpassUrl} target="_blank" rel="noreferrer">PLUGのイベント・活動を見る <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="about" id="about">
        <p className="section-index">03 — HOW IT WORKS</p>
        <div className="about-title">
          <h2>現場から始め、<br />越境して育てる。</h2>
          <p>PLUGの価値観を、作品を見つけて持ち帰る4つの行動に落とし込みます。</p>
        </div>
        <ol className="steps">
          <li><span>01 · FIELD-FIRST</span><h3>現場から探す</h3><p>流行より、解決したい課題、利用環境、費用から自分に合う作品を探す。</p></li>
          <li><span>02 · BIAS TO ACTION</span><h3>確かめて動かす</h3><p>必要ライセンス、導入時間、権限を確認し、まず小さく試してみる。</p></li>
          <li><span>03 · CROSS BOUNDARIES</span><h3>越境して持ち帰る</h3><p>Power Platform、Web、モバイル、AI、OSSの境界を越えて工夫を生かす。</p></li>
          <li><span>04 · LEARN TOGETHER</span><h3>学びを返す</h3><p>リアクションや導入報告を返し、次に挑戦する人ができるようになる力を渡す。</p></li>
        </ol>
      </section>

      <section className="submit-section" id="submit">
        <div>
          <p className="section-index">BRING YOUR SOLUTION</p>
          <h2>試した事実を、<br />誰かのPowerに。</h2>
        </div>
        <div className="submit-copy">
          <p>完成度より、現場で動かしたことを大切にします。小さなアプリ、便利なフロー、ひとつのコンポーネントや試行錯誤から持ち寄れます。</p>
          {submissionUrl ? (
            <a className="submit-button" href={submissionUrl} target="_blank" rel="noreferrer">匿名フォームから掲載申請 <span aria-hidden="true">↗</span></a>
          ) : (
            <span className="submit-button disabled" aria-disabled="true">掲載フォーム準備中</span>
          )}
          <small>作者本人からの申請のみ · サインイン不要 · 初期掲載無料 · 行動規範への同意が必要です</small>
        </div>
      </section>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top"><Image className="brand-logo" src={plugLogo} alt="" /><span>PLUG<br />SOLUTIONS</span></a>
        <p>つなぐ × 電源を入れる × ギャップを埋める</p>
        <div><a href="#catalog">探す</a><a href="#plug">PLUGについて</a><a href="#submit">掲載する</a><a href={plugGuideUrl} target="_blank" rel="noreferrer">ガイド ↗</a><a href={plugConnpassUrl} target="_blank" rel="noreferrer">connpass ↗</a></div>
        <small>minoru365による個人運営 · MICROSOFT非公式 · 2026</small>
      </footer>
    </main>
  );
}
