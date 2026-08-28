import Image from "next/image";
import Link from "next/link";
import plugLogo from "../assets/完成品(縁あり).png";

const plugConnpassUrl = "https://plug.connpass.com/";

type SiteFooterProps = {
  reportUrl?: string;
};

export default function SiteFooter({ reportUrl }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <Link className="brand footer-brand" href="/#top" aria-label="PLUG Solutions ホームへ戻る">
        <Image className="brand-logo" src={plugLogo} alt="" />
        <span>PLUG<br />SOLUTIONS</span>
      </Link>
      <nav aria-label="フッターナビゲーション">
        <Link href="/#catalog">探す</Link>
        <Link href="/#plug">PLUGについて</Link>
        <Link href="/#submit">掲載する</Link>
        <Link href="/guide/">掲載ガイド</Link>
        <Link href="/privacy/">プライバシー</Link>
        <Link href="/lounge/">PLUG Lounge</Link>
        <a href={plugConnpassUrl} target="_blank" rel="noreferrer">connpass ↗</a>
        {reportUrl && <a href={reportUrl} target="_blank" rel="noreferrer">掲載内容を報告 ↗</a>}
      </nav>
      <small><a href="https://x.com/meccha__eeyan" target="_blank" rel="noreferrer">連絡先 ↗</a> · 2026</small>
    </footer>
  );
}
