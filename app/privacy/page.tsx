import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "../SiteFooter";

export const metadata: Metadata = {
  title: "プライバシーポリシー — PLUG Solutions",
  description: "PLUG Solutionsにおける情報の収集、利用、保管、公開について説明します。",
};

const contactUrl = "https://x.com/meccha__eeyan";

export default function PrivacyPage() {
  return (
    <main className="subpage-shell privacy-page">
      <header className="detail-header">
        <Link className="back-link" href="/">← PLUG Solutionsへ戻る</Link>
        <span>PRIVACY</span>
      </header>

      <section className="subpage-hero privacy-hero">
        <p className="section-index">PRIVACY POLICY</p>
        <h1>情報の扱いを、<br />わかりやすく。</h1>
        <p>PLUG Solutionsは、掲載申請と交流機能に必要な情報だけを扱います。</p>
      </section>

      <div className="privacy-content">
        <p className="privacy-updated">制定・更新日：2026年8月28日</p>

        <section className="privacy-section">
          <p className="section-index">01 — 運営者・連絡先</p>
          <h2>運営者</h2>
          <p>PLUG Solutions運営（PLUG／Power Platform Local User Group）</p>
          <p>連絡先：<a href={contactUrl} target="_blank" rel="noreferrer">X（@meccha__eeyan）↗</a></p>
          <p className="privacy-note">掲載内容の修正・取り下げ、情報の利用に関する問い合わせは、公開中の作者Xアカウントなど、本人確認できる方法でご連絡ください。</p>
        </section>

        <section className="privacy-section">
          <p className="section-index">02 — 取得する情報</p>
          <h2>必要な情報だけ</h2>
          <div className="privacy-grid">
            <article>
              <h3>掲載申請（Microsoft Forms）</h3>
              <p>作者表示名、公開Xアカウント、作品名・概要、種類や用途、配布先URL、関連URL、任意のサムネイル候補URL、申請条件への同意を受け付けます。</p>
              <p>Formsはサインイン不要・氏名やメールアドレスの自動収集なし・ファイルアップロードなしで設定しています。</p>
            </article>
            <article>
              <h3>審査・掲載の記録</h3>
              <p>申請の重複防止、審査、問い合わせ対応、掲載・修正・取り下げのため、Formsの回答ID、回答日時、審査状態、審査メモなどをSharePoint等の非公開領域で管理します。</p>
            </article>
            <article>
              <h3>リアクション</h3>
              <p>「気になる」「使ってみた」「導入できた」の種別、作品slug、ブラウザ内で生成した匿名tokenのハッシュ、UTC日付をCloudflare Worker／D1に保存します。</p>
              <p>生のtoken、氏名、メールアドレス、Xアカウント、IPアドレス、User-Agentはアプリのデータベースへ保存しません。</p>
            </article>
            <article>
              <h3>ブラウザの保存領域</h3>
              <p>リアクションの連打防止のため、匿名tokenと作品ごとの選択状態をlocalStorageに保存します。ログイン、本人確認、広告配信には使用しません。</p>
            </article>
          </div>
        </section>

        <section className="privacy-section">
          <p className="section-index">03 — 利用目的</p>
          <h2>何のために使うか</h2>
          <ul className="privacy-list">
            <li>掲載申請の受付、内容確認、審査、掲載・修正・取り下げを行うため</li>
            <li>掲載内容に確認が必要な場合、入力された公開Xアカウントへ連絡するため</li>
            <li>重複登録、リアクションの連打、障害や不正利用を確認するため</li>
            <li>サービスの安全な運営、問い合わせ対応、手順や機能の改善のため</li>
          </ul>
          <p>上記以外の広告配信、個人のプロファイリング、販売目的の利用は行いません。</p>
        </section>

        <section className="privacy-section">
          <p className="section-index">04 — 公開する情報</p>
          <h2>掲載時の範囲</h2>
          <p>承認された作品名、作者表示名、公開Xアカウント、概要、種類・用途、配布先URL、審査で分類した関連リンク、処理済みサムネイル、集計したリアクション数を公開します。</p>
          <p>Formsの回答ID、同意記録、回答日時、審査メモ、候補画像URL、token hash、その他の非公開情報は公開しません。申請内容に個人情報・顧客情報・機密情報が含まれていた場合は掲載しません。</p>
        </section>

        <section className="privacy-section">
          <p className="section-index">05 — 外部サービス</p>
          <h2>利用するサービス</h2>
          <ul className="privacy-list">
            <li>Microsoft Forms、SharePoint、Power Automate、Power Apps：申請受付・審査・非公開管理</li>
            <li>GitHub Actions、GitHub：承認済みデータの検証、レビュー、公開ファイルの生成</li>
            <li>Azure Static Web Apps：公開サイトの配信</li>
            <li>Cloudflare Workers、D1：リアクションの集計と重複防止</li>
            <li>chat.exe：同意した場合だけPLUG Loungeの埋め込み表示</li>
          </ul>
          <p>各サービス提供者が取り扱うログ、保存場所、保持期間、国外での取り扱いは、各提供者の規約・プライバシー情報にも従います。運営者は各サービスへ送る情報を必要最小限にします。</p>
        </section>

        <section className="privacy-section">
          <p className="section-index">06 — 保管・削除</p>
          <h2>必要な期間だけ</h2>
          <p>申請・審査・掲載・問い合わせ対応に必要な期間だけ非公開記録を保管し、目的を達成して不要になった情報は合理的な期間内に削除または利用できない形にします。リアクションのtoken hashは、集計と同一作品・同一種別の重複防止に必要な期間だけ保管します。</p>
          <p>掲載作品の修正・取り下げ、申請情報の訂正・削除に関する相談は、<a href={contactUrl} target="_blank" rel="noreferrer">連絡先（X）↗</a>からご連絡ください。本人確認や対象情報の特定をお願いする場合があります。</p>
        </section>

        <section className="privacy-section privacy-callout">
          <p className="section-index">07 — 申請前に</p>
          <h2>送らないもの</h2>
          <p>本名、メールアドレス、会社や顧客の機密情報、社内URL、APIキー、パスワードなどは入力しないでください。公開してよい作者表示名とXアカウントだけを入力してください。</p>
        </section>

        <section className="privacy-section">
          <p className="section-index">08 — 改定</p>
          <h2>内容の更新</h2>
          <p>サービスの機能や利用サービスの変更に応じて本ポリシーを改定します。重要な変更はサイト上で案内し、ページ上部の更新日を更新します。</p>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
