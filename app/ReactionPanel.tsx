"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactionCounts } from "../lib/catalog-types";

type ReactionType = "interested" | "tried" | "adopted";

type Props = {
  slug: string;
  initialCounts: ReactionCounts[string];
};

const REACTIONS: ReadonlyArray<{ type: ReactionType; label: string }> = [
  { type: "interested", label: "気になる" },
  { type: "tried", label: "使ってみた" },
  { type: "adopted", label: "導入できた" },
];
const API_BASE = (process.env.NEXT_PUBLIC_REACTIONS_API_URL ?? "").replace(/\/+$/, "");
const TOKEN_KEY = "plug-solutions:visitor-token";
const reactionStorageKey = (slug: string, type: ReactionType) => `plug-solutions:reaction:${slug}:${type}`;

function validCounts(value: unknown, fallback: ReactionCounts[string]): ReactionCounts[string] {
  if (!value || typeof value !== "object") return fallback;
  const candidate = value as Record<string, unknown>;
  return {
    interested: Number.isInteger(candidate.interested) && Number(candidate.interested) >= 0 ? Number(candidate.interested) : fallback.interested,
    tried: Number.isInteger(candidate.tried) && Number(candidate.tried) >= 0 ? Number(candidate.tried) : fallback.tried,
    adopted: Number.isInteger(candidate.adopted) && Number(candidate.adopted) >= 0 ? Number(candidate.adopted) : fallback.adopted,
  };
}

function createVisitorToken() {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function ReactionPanel({ slug, initialCounts }: Props) {
  const [counts, setCounts] = useState(initialCounts);
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [consumed, setConsumed] = useState<Partial<Record<ReactionType, boolean>>>({});
  const [pending, setPending] = useState<ReactionType | null>(null);
  const [message, setMessage] = useState(
    API_BASE ? "読み込み中…" : "リアクションAPI準備中。現在の集計を表示しています。",
  );
  const labels = useMemo(() => Object.fromEntries(REACTIONS.map(({ type, label }) => [type, label])), []);

  useEffect(() => {
    let cancelled = false;
    const storageTimer = window.setTimeout(() => {
      try {
        const storage = window.localStorage;
        let token = storage.getItem(TOKEN_KEY);
        if (!token) {
          token = createVisitorToken();
          storage.setItem(TOKEN_KEY, token);
        }
        const used = Object.fromEntries(
          REACTIONS.filter(({ type }) => storage.getItem(reactionStorageKey(slug, type)) === "1")
            .map(({ type }) => [type, true]),
        ) as Partial<Record<ReactionType, boolean>>;
        if (!cancelled) {
          setVisitorToken(token);
          setConsumed(used);
          setStorageReady(true);
        }
      } catch {
        if (!cancelled) {
          setStorageAvailable(false);
          setStorageReady(true);
          setMessage("このブラウザではリアクションを保存できません。");
        }
      }
    }, 0);

    if (API_BASE) {
      fetch(`${API_BASE}/v1/reactions/${encodeURIComponent(slug)}`, { headers: { Accept: "application/json" } })
        .then(async (response) => {
          if (!response.ok) throw new Error("reaction API unavailable");
          return response.json();
        })
        .then((payload: unknown) => {
          if (cancelled || !payload || typeof payload !== "object") return;
          const body = payload as { counts?: unknown };
          setCounts((current) => validCounts(body.counts, current));
          setMessage("リアルタイム集計");
        })
        .catch(() => {
          if (!cancelled) setMessage("現在の静的集計を表示しています。");
        });
    }
    return () => { cancelled = true; window.clearTimeout(storageTimer); };
  }, [slug]);

  async function react(type: ReactionType) {
    if (!API_BASE || !storageAvailable || !storageReady || !visitorToken || consumed[type] || pending) return;
    setPending(type);
    setMessage("送信中…");
    try {
      const response = await fetch(`${API_BASE}/v1/reactions/${encodeURIComponent(slug)}`, {
        method: "POST",
        headers: { "content-type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ reactionType: type, visitorToken }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (response.status === 429) {
        setMessage("本日の受付上限に達しました。");
        return;
      }
      if (!response.ok) {
        setMessage("リアクションを受け付けられませんでした。");
        return;
      }
      if (payload && typeof payload === "object") {
        setCounts((current) => validCounts((payload as { counts?: unknown }).counts, current));
      }
      setConsumed((current) => ({ ...current, [type]: true }));
      try {
        window.localStorage.setItem(reactionStorageKey(slug, type), "1");
      } catch {
        setStorageAvailable(false);
        setMessage("このブラウザではリアクションを保存できません。");
        return;
      }
      setMessage(`${labels[type]}を記録しました。`);
    } catch {
      setMessage("接続できないため、もう一度お試しください。");
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="reaction-panel" aria-labelledby="reaction-heading">
      <div>
        <p className="section-index">REACTIONS</p>
        <h2 id="reaction-heading">作品へのフィードバック</h2>
        <p>コメントは公開しません。試した段階を匿名で伝えられます。</p>
      </div>
      <div>
        <dl className="reaction-counts">
          {REACTIONS.map(({ type, label }) => (
            <div key={type}><dt>{label}</dt><dd>{counts[type]}</dd></div>
          ))}
        </dl>
        <div className="reaction-actions" aria-label="リアクションを送る">
          {REACTIONS.map(({ type, label }) => (
            <button
              className="outline-button"
              type="button"
              key={type}
              onClick={() => react(type)}
              disabled={!API_BASE || !storageAvailable || !storageReady || Boolean(consumed[type]) || pending !== null}
              aria-label={`${label}${consumed[type] ? "（このブラウザから送信済み）" : ""}`}
            >
              {label}{consumed[type] ? " ✓" : ""}
            </button>
          ))}
        </div>
        <p className="reaction-status" aria-live="polite">{message}</p>
      </div>
    </section>
  );
}
