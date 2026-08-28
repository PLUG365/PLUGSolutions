import type { Metadata } from "next";
import Link from "next/link";
import { getLoungeConfig } from "../../lib/lounge-config.mjs";
import LoungePanel from "./LoungePanel";
import SiteFooter from "../SiteFooter";

export const metadata: Metadata = {
  title: "PLUG Lounge — PLUG Solutions",
  description: "PLUGの作品や工夫を気軽に話せる交流ラウンジです。",
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
        <p className="section-index">CONNECT &amp; LEARN TOGETHER</p>
        <h1><span>つくった人と、</span><span>使いたい人が話せる場所。</span></h1>
        <p>気軽に楽しく会話しましょう。</p>
      </section>

      <LoungePanel config={config} />

      <SiteFooter />
    </main>
  );
}
