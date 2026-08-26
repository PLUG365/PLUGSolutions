import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "掲載・運営ガイド — PLUG Solutions",
  description: "PLUG Solutionsへの掲載申請と、審査・公開・取り下げの流れを説明します。",
};

export default function GuidePage() {
  const submissionUrl = process.env.NEXT_PUBLIC_SUBMISSION_FORM_URL;
  const reportUrl = process.env.NEXT_PUBLIC_REPORT_FORM_URL;

  return (
    <main className="subpage-shell guide-page">
      <header className="detail-header">
        <Link className="back-link" href="/">← PLUG Solutionsへ戻る</Link>
        <span>PUBLIC GUIDE</span>
      </header>

      <section className="subpage-hero">
        <p className="section-index">03 — BRING &amp; OPERATE</p>
        <h1><span>持ち寄る人にも、</span><span><span className="mobile-break">運営する人にも</span><span className="mobile-break">透明に。</span></span></h1>
        <p>申請しただけで自動掲載はしません。公開情報を人が確認し、レビュー可能な変更として扱ってから本番へ届けます。</p>
      </section>

      <nav className="guide-jump" aria-label="ガイド内メニュー">
        <a href="#applicant">掲載を申し込む方へ</a>
        <a href="#operator">運営者の公開手順</a>
        <a href="#privacy">公開・非公開の境界</a>
      </nav>

      <section className="guide-section" id="applicant">
        <p className="section-index">FOR MAKERS</p>
        <h2>掲載を申し込む方へ</h2>
        <div className="guide-grid">
          <article><span>01</span><h3>公開情報を準備</h3><p>作品名、作者表示名、公開Xアカウント、概要、配布先URLを用意します。完成品でなくても、現場で試した事実があれば申請できます。</p></article>
          <article><span>02</span><h3>Formsから申請</h3><p>Microsoftアカウントへのサインインは不要です。作者本人または公開権限を持つ人だけが申請してください。</p></article>
          <article><span>03</span><h3>人による審査</h3><p>権利、リンク、ライセンス、導入条件、画像内容を運営者が確認します。確認が必要な場合は公開Xアカウントへ連絡します。</p></article>
          <article><span>04</span><h3>公開・修正</h3><p>審査と公開作業の完了後に掲載されます。修正や取り下げは、掲載中の作者Xアカウントから本人確認できる形で依頼してください。</p></article>
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
          <li><strong>PR</strong><span>GitHub Actionsが承認済みの1件を読み、公開許可項目と処理済み画像だけのPull Requestを作る。</span></li>
          <li><strong>確認・merge</strong><span>現在の審査状態と更新時刻、掲載内容、画像、CI結果を人が照合してからmergeする。</span></li>
          <li><strong>本番公開</strong><span>mainの対象コミットを手動デプロイし、公開URLで内容とリンクを確認する。</span></li>
          <li><strong>公開済み</strong><span>ライブ確認後にだけCanvasアプリで公開済みにする。失敗時は承認のまま保持する。</span></li>
        </ol>
        <div className="operator-alert">
          <strong>自動化の停止線</strong>
          <p>回答だけで公開しません。CI失敗、審査状態の変化、版の不一致、非公開情報の混入があればmerge・本番公開を止めます。</p>
        </div>
      </section>

      <section className="guide-section privacy-guide" id="privacy">
        <p className="section-index">PUBLIC / PRIVATE</p>
        <h2>公開・非公開の境界</h2>
        <div className="privacy-columns">
          <article className="public-data"><h3>サイトへ公開するもの</h3><p>作者表示名、公開Xアカウント、作品概要、分類、配布・ソース・導入手順URL、ライセンス、費用、必要環境、処理済みサムネイル。</p></article>
          <article className="private-data"><h3>公開しないもの</h3><p>Forms内部の回答識別情報、同意記録、審査メモ、画像候補URL、受付・審査の内部情報。氏名、メール、会社名、顧客情報、秘密情報は設問として求めません。入力しないでください。誤って入力されても公開しません。</p></article>
        </div>
        <p className="guide-note">公開用の作者表示名とXアカウントは掲載されるため、完全な匿名申請ではありません。サインイン不要の申請です。</p>
        {reportUrl ? <a className="outline-button" href={reportUrl} target="_blank" rel="noreferrer">掲載内容・取り下げを相談する ↗</a> : <span className="guide-note">相談フォームは準備中です。</span>}
      </section>

      <footer className="detail-footer">
        <Link href="/">PLUG Solutions</Link>
        <a href="https://plug.connpass.com/" target="_blank" rel="noreferrer">PLUGの開催予定 ↗</a>
      </footer>
    </main>
  );
}
