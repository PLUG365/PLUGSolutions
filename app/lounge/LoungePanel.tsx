"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { buildLoungeEmbedUrl, getLoungeTimerDelay, getLoungeViewState } from "../../lib/lounge-config.mjs";

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
  const viewState = getLoungeViewState(config, now, consented);
  const pilotEndTime = config.mode === "pilot" ? config.endTime : null;

  useEffect(() => {
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Polling keeps the schedule current, but do not leave an open iframe around
  // for the remainder of the poll interval when the event ends. The timeout
  // is recreated/cleaned up with the config so React Strict Mode cannot leave
  // duplicate timers behind; a late callback after sleep still re-evaluates
  // the view state through the normal render path.
  useEffect(() => {
    if (pilotEndTime === null) return undefined;
    let timer: number | undefined;
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      const remaining = pilotEndTime - Date.now();
      if (remaining <= 0) {
        tick();
        return;
      }
      timer = window.setTimeout(schedule, getLoungeTimerDelay(pilotEndTime));
    };
    schedule();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [pilotEndTime]);

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

  if (viewState === "scheduled") {
    return (
      <section className="lounge-status" aria-labelledby="lounge-status-heading">
        <p className="section-index">ROOM STATUS — SCHEDULED</p>
        <h2 id="lounge-status-heading">開催時間外です。</h2>
        <p>{formatJst(config.startAt)}〜{formatJst(config.endAt)}（日本時間）に開室します。</p>
        <p className="lounge-note">開催時刻は端末の時計を基準に判定します。直接のchat.exe URLはPLUG側のアクセス制御ではありません。</p>
      </section>
    );
  }

  if (viewState === "consent") {
    return (
      <section className="lounge-consent" aria-labelledby="lounge-consent-heading">
        <p className="section-index">BEFORE CONNECTING</p>
        <h2 id="lounge-consent-heading">外部サービスへの接続前に</h2>
        <p>入室すると、第三者サービスのchat.exeへ接続します。表示名、投稿内容、IPアドレス、OS、利用状況などがサービス提供者側で取り扱われる場合があります。</p>
        <ul>
          <li>個人情報、顧客情報、機密情報を書き込まない</li>
          <li>PLUGの行動規範を守り、相手を尊重する</li>
        </ul>
        <div className="lounge-links">
          <a href="https://chatexe.net/" target="_blank" rel="noreferrer">chat.exe公式情報 ↗</a>
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
