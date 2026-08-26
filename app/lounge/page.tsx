import type { Metadata } from "next";
import Link from "next/link";
import { getLoungeConfig } from "../../lib/lounge-config.mjs";
import LoungePanel from "./LoungePanel";

export const metadata: Metadata = {
  title: "PLUG Lounge — PLUG Solutions",
  description: "PLUGのイベントに合わせて開く、期間限定の交流ラウンジです。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoungePage() {
  const config = getLoungeConfig(process.env);

  return (
    <main className="subpage-shell lounge-page">
      <header className="detail-header">
        <Link className="back-link" href="/">← PLUG Solutionsへ戻る</Link>
        <span>PLUG LOUNGE</span>
      </header>

      <section className="subpage-hero lounge-hero">
        <p className="section-index">04 — CONNECT &amp; LEARN TOGETHER</p>
        <h1><span>つくった人と、</span><span>使いたい人が話せる場所。</span></h1>
        <p>PLUG Loungeは、イベント開催時だけ開く交流スペースです。常設の会議室ではなく、作品や現場の工夫をきっかけに、気軽に話すための実験的な場です。</p>
      </section>

      <LoungePanel config={config} />

      <section className="lounge-safety" aria-labelledby="lounge-safety-heading">
        <p className="section-index">SAFETY BOUNDARY</p>
        <h2 id="lounge-safety-heading">安心して試すための境界</h2>
        <div className="guide-grid three-columns">
          <article><span>01</span><h3>一時開室</h3><p>イベントごとに部屋を切り替え、開催時間外は接続しません。</p></article>
          <article><span>02</span><h3>テキスト専用</h3><p>pilot中はカメラ、マイク、画面共有をPLUG側と埋め込み側の両方で無効にします。</p></article>
          <article><span>03</span><h3>人が見守る</h3><p>問題時はPLUGページの接続導線を閉じ、次回は新しいroomへ切り替えます。既知の旧room直URL自体はPLUG側から停止できません。</p></article>
        </div>
      </section>

      <footer className="detail-footer">
        <Link href="/guide/">掲載・利用ガイド</Link>
        <a href="https://plug.connpass.com/" target="_blank" rel="noreferrer">PLUGの開催予定 ↗</a>
      </footer>
    </main>
  );
}
