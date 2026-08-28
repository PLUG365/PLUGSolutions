"use client";

import { useMemo, useState } from "react";
import { buildLoungeEmbedUrl } from "../../lib/lounge-config.mjs";

type LoungeConfig =
  | { mode: "closed"; reason: string }
  | { mode: "open"; room: string };

type Props = {
  config: LoungeConfig;
};

export default function LoungePanel({ config }: Props) {
  const [consented, setConsented] = useState(false);
  const embedUrl = useMemo(
    () => (config.mode === "open" ? buildLoungeEmbedUrl(config) : null),
    [config],
  );

  if (config.mode === "closed") {
    return (
      <section className="lounge-status closed" aria-labelledby="lounge-status-heading">
        <p className="section-index">ROOM STATUS — CLOSED</p>
        <h2 id="lounge-status-heading">現在は閉室中です。</h2>
        <p>運営上の都合で一時的に公開を停止しています。再開時はこのページに表示します。</p>
        <a className="outline-button" href="https://plug.connpass.com/" target="_blank" rel="noreferrer">PLUGの開催予定を見る ↗</a>
      </section>
    );
  }

  if (!consented) {
    return (
      <section className="lounge-consent" aria-labelledby="lounge-consent-heading">
        <p className="section-index">BEFORE CONNECTING</p>
        <h2 id="lounge-consent-heading">PLUG Loungeへ入室</h2>
        <p>この先は外部サービスのchat.exeへ接続します。内容を確認してから接続してください。</p>
        <p>個人情報・顧客情報・機密情報は入力せず、PLUGの行動規範を守ってご利用ください。</p>
        <div className="lounge-links">
          <a href="https://chatexe.net/index.html" target="_blank" rel="noreferrer">chat.exe公式サイト ↗</a>
        </div>
        <button className="primary-button" type="button" onClick={() => setConsented(true)}>
          内容を理解して接続する <span aria-hidden="true">→</span>
        </button>
      </section>
    );
  }

  return (
    <section className="lounge-room" aria-labelledby="lounge-room-heading">
      <div className="lounge-room-header">
        <div>
          <p className="section-index">ROOM STATUS — OPEN</p>
          <h2 id="lounge-room-heading">PLUG Lounge</h2>
        </div>
      </div>
      <iframe
        className="lounge-frame"
        src={embedUrl ?? undefined}
        title="PLUG Lounge powered by chat.exe"
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-forms allow-same-origin allow-scripts"
      />
    </section>
  );
}
