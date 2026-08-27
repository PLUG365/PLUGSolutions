import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "../SiteFooter";

export const metadata: Metadata = {
  title: "掲載・運営ガイド — PLUG Solutions",
  description: "PLUG Solutionsへの掲載申請、審査・公開・取り下げ手順を説明します。",
};

export default function GuidePage() {
  const submissionUrl = process.env.NEXT_PUBLIC_SUBMISSION_FORM_URL;

  return (
    <main className="subpage-shell guide-page">
      <header className="detail-header">
        <Link className="back-link" href="/">← PLUG Solutionsへ戻る</Link>
        <span>PUBLIC GUIDE</span>
      </header>

      <section className="subpage-hero">
        <p className="section-index">BRING &amp; OPERATE</p>
        <h1><span>持ち寄る人にも、</span><span><span className="mobile-break">運営する人にも</span><span className="mobile-break">透明に。</span></span></h1>
        <p>申請いただいた内容を、承認後に掲載します。</p>
      </section>

      <nav className="guide-jump" aria-label="ガイド内メニュー">
        <a href="#applicant">掲載を申し込む方へ</a>
        <a href="#operator">運営者の公開手順</a>
        <a href="#privacy">承認審査基準</a>
      </nav>

      <section className="guide-section" id="applicant">
        <p className="section-index">FOR MAKERS</p>
        <h2>掲載を申し込む方へ</h2>
        <div className="guide-grid">
          <article><span>01</span><h3>公開情報を準備</h3><p>作品名、作者表示名、公開Xアカウント、概要、配布先URLを用意します。完成品でなくても、現場で試した事実があれば申請できます。</p></article>
          <article><span>02</span><h3>Formsから申請</h3><p>Microsoftアカウントへのサインインは不要です。作者本人または公開権限を持つ人だけが申請してください。</p></article>
          <article><span>03</span><h3>人による審査</h3><p>申請内容を運営者が確認します。確認が必要な場合は公開Xアカウントへ連絡します。</p></article>
          <article><span>04</span><h3>公開・修正</h3><p>審査と公開作業の完了後に掲載されます。修正や取り下げは、掲載中の作者Xアカウントから本人確認できる形で<a href="https://x.com/meccha__eeyan" target="_blank" rel="noreferrer">連絡先</a>まで依頼してください。</p></article>
        </div>
        {submissionUrl ? (
          <a className="primary-button guide-cta" href={submissionUrl} target="_blank" rel="noreferrer">掲載申請フォームを開く <span aria-hidden="true">↗</span></a>
        ) : (
          <span className="primary-button guide-cta disabled" aria-disabled="true">掲載フォーム準備中</span>
        )}
      </section>

      <section className="guide-section operator-guide" id="operator">
        <p className="section-index">FOR OPERATORS</p>
        <h2>運営者の公開手順</h2>
        <ol className="guide-flow">
          <li><strong>申請</strong><span>Formsの匿名回答を受付し、同じ回答を重複登録しない。</span></li>
          <li><strong>審査</strong><span>Canvasアプリで公開項目と画像候補を確認し、不足があれば要確認、掲載可能なら承認にする。</span></li>
          <li><strong>PR・CI許可</strong><span>GitHub Actionsが承認済みの1件からPull Requestを作る。変更内容を確認し、「Approve workflows to run」でCIだけを開始する。</span></li>
          <li><strong>確認・merge</strong><span>現在の審査状態と更新時刻、公開許可項目、処理済み画像、CI結果を人が照合してからmergeする。</span></li>
          <li><strong>本番公開</strong><span>mainの対象コミットを手動デプロイし、公開URLで内容とリンクを確認する。</span></li>
          <li><strong>公開済み</strong><span>ライブ確認後にだけCanvasアプリで公開済みにする。失敗時は承認のまま保持する。</span></li>
        </ol>
      </section>

      <section className="guide-section privacy-guide" id="privacy">
        <p className="section-index">REVIEW CRITERIA</p>
        <h2>承認審査基準</h2>
        <div className="review-criteria">
          <p>PLUGポリシーに沿う内容かどうかを基準に判断します。</p>
          <a className="outline-button" href="https://plug.connpass.com/" target="_blank" rel="noreferrer">PLUGの活動を見る ↗</a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
