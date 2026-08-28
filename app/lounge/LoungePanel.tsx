"use client";

import { useMemo } from "react";
import { buildLoungeEmbedUrl } from "../../lib/lounge-config.mjs";

type LoungeConfig =
  | { mode: "closed"; reason: string }
  | { mode: "open"; room: string };

type Props = {
  config: LoungeConfig;
};

export default function LoungePanel({ config }: Props) {
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
