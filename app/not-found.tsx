import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <p className="section-index">404 — NOT FOUND</p>
      <h1>この解決策は、<br />まだここにありません。</h1>
      <p>URLが変わったか、掲載が取り下げられた可能性があります。</p>
      <Link className="primary-button" href="/#catalog">カタログへ戻る</Link>
    </main>
  );
}
