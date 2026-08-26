"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { buildLoungeEmbedUrl, isLoungeOpen } from "../../lib/lounge-config.mjs";

type LoungeConfig =
  | { mode: "closed"; reason: string }
  | {
      mode: "pilot";
      room: string;
      startAt: string;
      endAt: string;
      startTime: number;
      endTime: number;
    };

type Props = {
  config: LoungeConfig;
};

function formatJst(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

export default function LoungePanel({ config }: Props) {
  const [now, tick] = useReducer(() => Date.now(), null as number | null);
  const [consented, setConsented] = useState(false);
  const embedUrl = useMemo(
    () => (config.mode === "pilot" ? buildLoungeEmbedUrl(config) : null),
    [config],
  );

  useEffect(() => {
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (config.mode === "closed") {
    return (
      <section className="lounge-status closed" aria-labelledby="lounge-status-heading">
        <p className="section-index">ROOM STATUS — CLOSED</p>
        <h2 id="lounge-status-heading">現在は閉室中です。</h2>
        <p>PLUGのイベントや交流企画に合わせて、一時的に開室します。次回案内はconnpassでお知らせします。</p>
        <a className="outline-button" href="https://plug.connpass.com/" target="_blank" rel="noreferrer">PLUGの開催予定を見る ↗</a>
      </section>
    );
  }

  const open = now !== null && isLoungeOpen(config, now);
  if (!open) {
    return (
      <section className="lounge-status" aria-labelledby="lounge-status-heading">
        <p className="section-index">ROOM STATUS — SCHEDULED</p>
        <h2 id="lounge-status-heading">開催時間外です。</h2>
        <p>{formatJst(config.startAt)}〜{formatJst(config.endAt)}（日本時間）に開室します。</p>
        <p className="lounge-note">開催時刻は端末の時計を基準に判定します。直接のchat.exe URLはPLUG側のアクセス制御ではありません。</p>
      </section>
    );
  }

  if (!consented) {
    return (
      <section className="lounge-consent" aria-labelledby="lounge-consent-heading">
        <p className="section-index">BEFORE CONNECTING</p>
        <h2 id="lounge-consent-heading">外部サービスへの接続前に</h2>
        <p>入室すると、第三者サービスのchat.exeへ接続します。表示名、投稿内容、IPアドレス、OS、利用状況などがサービス提供者側で取り扱われる場合があります。</p>
        <ul>
          <li>個人情報、顧客情報、機密情報を書き込まない</li>
          <li>PLUGの行動規範を守り、相手を尊重する</li>
          <li>この試行では映像、音声、画面共有を使用しない</li>
          <li>「private」は部屋一覧から隠す設定であり、認証ではない</li>
        </ul>
        <div className="lounge-links">
          <a href="https://chatexe.net/" target="_blank" rel="noreferrer">chat.exe公式情報 ↗</a>
          <a href="https://plug365.github.io/PLUGGuide/" target="_blank" rel="noreferrer">PLUGの行動規範 ↗</a>
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
        <button className="outline-button" type="button" onClick={() => setConsented(false)}>退室する</button>
      </div>
      <p className="lounge-note">テキスト専用pilotです。困ったときは退室し、イベント運営者へお知らせください。</p>
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
