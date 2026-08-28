"use client";
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- cards expose an internally scrollable description. */

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactionCounts, Solution } from "../lib/catalog-types";

type Props = {
  solutions: Solution[];
  reactions: ReactionCounts;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium" }).format(new Date(`${date}T00:00:00Z`));
}

function fallbackColor(slug: string) {
  const colors = ["coral", "blue", "lime", "purple", "sand", "aqua"];
  const score = [...slug].reduce((total, character) => total + character.charCodeAt(0), 0);
  return colors[score % colors.length];
}

export default function CatalogExplorer({ solutions, reactions }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("すべて");
  const filters = useMemo(
    () => ["すべて", ...new Set(solutions.flatMap((solution) => solution.categories))],
    [solutions],
  );

  const visibleSolutions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return solutions.filter((solution) => {
      const matchesFilter = filter === "すべて" || solution.categories.includes(filter);
      const haystack = [
        solution.title,
        solution.maker.displayName,
        solution.maker.xHandle,
        solution.type,
        solution.description,
        ...solution.categories,
        ...solution.tags,
      ].join(" ").toLowerCase();
      return matchesFilter && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [filter, query, solutions]);

  return (
    <>
      <div className="catalog-controls">
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <span className="sr-only">作品を検索</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="課題、技術、作品名で検索" />
        </label>
        <div className="filter-row" aria-label="作品カテゴリ">
          {filters.map((item) => (
            <button className={filter === item ? "active" : ""} type="button" key={item} onClick={() => setFilter(item)} aria-pressed={filter === item}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {visibleSolutions.length ? (
        <div className="solution-grid">
          {visibleSolutions.map((solution, index) => {
            const counts = reactions[solution.slug];
            const reactionTotal = counts ? counts.interested + counts.tried + counts.adopted : 0;
            return (
              <article className="solution-card" key={solution.slug} tabIndex={0}>
                <div
                  className={`card-art ${fallbackColor(solution.slug)}${solution.thumbnail ? " has-thumbnail" : ""}`}
                  style={solution.thumbnail ? { backgroundImage: `url(${solution.thumbnail})` } : undefined}
                  role={solution.thumbnail ? "img" : undefined}
                  aria-label={solution.thumbnail ? `${solution.title}のサムネイル` : undefined}
                >
                  <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
                  {!solution.thumbnail && <span className="card-mark">{solution.title.slice(0, 1)}</span>}
                </div>
                <div className="card-body">
                  <div className="card-topline"><span>{solution.type}</span><span>更新 {formatDate(solution.updatedAt)}</span></div>
                  <h3>{solution.title}</h3>
                  <p className="maker">
                    by {solution.maker.displayName} ·{" "}
                    <a href={solution.maker.xUrl} target="_blank" rel="noreferrer" aria-label={`${solution.maker.xHandle} のXプロフィールを開く`}>
                      {solution.maker.xHandle} ↗
                    </a>
                  </p>
                  <p className="card-description">{solution.description}</p>
                  <div className="tag-list">{solution.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                  <dl className="card-facts">
                    <div><dt>導入</dt><dd>{solution.setupTime}</dd></div>
                    <div><dt>費用</dt><dd>{solution.cost}</dd></div>
                    <div><dt>Premium</dt><dd>{solution.premiumRequired === null ? "対象外" : solution.premiumRequired ? "必要" : "不要"}</dd></div>
                  </dl>
                  <div className="card-footer">
                    <span>{reactionTotal > 0 ? `${reactionTotal} リアクション` : "掲載情報を確認"}</span>
                    <Link href={`/solutions/${solution.slug}/`}>詳しく見る <span aria-hidden="true">→</span></Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : solutions.length === 0 ? (
        <div className="empty-state launch-empty">
          <span>FOUNDING COLLECTION</span>
          <h3>掲載作品を募集しています。</h3>
          <p>作者本人から届いた作品だけを、人が内容と導入条件を確認して掲載します。</p>
          <a href="#submit">掲載方法を見る</a>
        </div>
      ) : (
        <div className="empty-state">
          <span>0 RESULTS</span>
          <h3>まだ、この組み合わせは空いています。</h3>
          <p>検索語やカテゴリを変えてみてください。</p>
          <button type="button" onClick={() => { setQuery(""); setFilter("すべて"); }}>条件をリセット</button>
        </div>
      )}
    </>
  );
}
