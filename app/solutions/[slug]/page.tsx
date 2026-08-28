import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllSolutions, getReactionCounts, getSolution } from "../../../lib/catalog";
import SiteFooter from "../../SiteFooter";

export const dynamicParams = false;

type PageProps = {
  params: Promise<{ slug: string }>;
};

const buildValidationSlug = "__build-validation__";

export async function generateStaticParams() {
  const solutions = await getAllSolutions();
  return solutions.length
    ? solutions.map((solution) => ({ slug: solution.slug }))
    : [{ slug: buildValidationSlug }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === buildValidationSlug) return { title: "作品が見つかりません — PLUG Solutions" };
  const solution = await getSolution(slug);
  if (!solution) return { title: "作品が見つかりません — PLUG Solutions" };

  return {
    title: `${solution.title} — PLUG Solutions`,
    description: solution.description,
    openGraph: {
      title: `${solution.title} — PLUG Solutions`,
      description: solution.description,
      type: "website",
    },
  };
}

export default async function SolutionPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === buildValidationSlug) notFound();
  const solution = await getSolution(slug);
  if (!solution) notFound();

  const reactions = await getReactionCounts(await getAllSolutions());
  const counts = reactions[solution.slug] ?? { interested: 0, tried: 0, adopted: 0 };
  const reactionUrl = process.env.NEXT_PUBLIC_REACTION_FORM_URL;
  const reportUrl = process.env.NEXT_PUBLIC_REPORT_FORM_URL;
  const relatedLinks = (solution.relatedUrls ?? []).filter(
    (url) => ![solution.distributionUrl, solution.sourceUrl, solution.instructionsUrl].includes(url),
  );

  return (
    <main className="solution-page">
      <header className="detail-header">
        <Link className="back-link" href="/#catalog">← カタログへ戻る</Link>
        <span>PLUG SOLUTIONS</span>
      </header>

      <article className="solution-detail">
        <div
          className={`solution-hero-art${solution.thumbnail ? " has-thumbnail" : ""}`}
          style={solution.thumbnail ? { backgroundImage: `url(${solution.thumbnail})` } : undefined}
          role="img"
          aria-label={solution.thumbnail ? `${solution.title}のサムネイル` : `${solution.title}の文字入りサムネイル`}
        >
          {!solution.thumbnail && <span>{solution.title.slice(0, 1)}</span>}
          <small>{solution.type}</small>
        </div>

        <div className="solution-detail-copy">
          <p className="section-index">SOLUTION DETAILS</p>
          <h1>{solution.title}</h1>
          <a className="maker-link" href={solution.maker.xUrl} target="_blank" rel="noreferrer">
            by {solution.maker.displayName} · {solution.maker.xHandle} ↗
          </a>
          <p className="solution-summary">{solution.description}</p>

          <div className="tag-list detail-tags">
            {[...solution.categories, ...solution.tags].map((tag) => <span key={tag}>{tag}</span>)}
          </div>

          <dl className="detail-list solution-facts">
            <div><dt>種類</dt><dd>{solution.type}</dd></div>
            <div><dt>ライセンス</dt><dd>{solution.license}</dd></div>
            <div><dt>公開／更新</dt><dd>{solution.publishedAt} ／ {solution.updatedAt}</dd></div>
            <div className="wide"><dt>前提条件</dt><dd>{solution.prerequisites.length ? solution.prerequisites.join("、") : "特になし"}</dd></div>
          </dl>

          <div className="solution-actions">
            <a className="primary-button" href={solution.distributionUrl} target="_blank" rel="noreferrer">入手・試用する ↗</a>
            {solution.instructionsUrl && <a className="outline-button" href={solution.instructionsUrl} target="_blank" rel="noreferrer">導入手順 ↗</a>}
            {solution.sourceUrl && <a className="outline-button" href={solution.sourceUrl} target="_blank" rel="noreferrer">ソースを見る ↗</a>}
            {relatedLinks.map((url, index) => (
              <a className="outline-button" href={url} target="_blank" rel="noreferrer" key={url}>
                関連リンク{index + 1} ↗
              </a>
            ))}
          </div>
        </div>
      </article>

      <section className="reaction-panel" aria-labelledby="reaction-heading">
        <div>
          <p className="section-index">REACTIONS</p>
          <h2 id="reaction-heading">作品へのフィードバック</h2>
          <p>コメントは公開しません。匿名フォームから、作品を試した段階だけを伝えられます。</p>
        </div>
        <dl className="reaction-counts">
          <div><dt>気になる</dt><dd>{counts.interested}</dd></div>
          <div><dt>使ってみた</dt><dd>{counts.tried}</dd></div>
          <div><dt>導入できた</dt><dd>{counts.adopted}</dd></div>
        </dl>
        {reactionUrl ? (
          <a className="outline-button" href={reactionUrl} target="_blank" rel="noreferrer">匿名でリアクションする ↗</a>
        ) : (
          <span className="outline-button disabled" aria-disabled="true">リアクションフォーム準備中</span>
        )}
      </section>

      <SiteFooter reportUrl={reportUrl} />
    </main>
  );
}
