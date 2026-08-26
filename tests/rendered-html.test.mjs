import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("exports the branded public home page without fictional activity", async () => {
  const html = await readFile(new URL("out/index.html", root), "utf8");

  assert.match(html, /<title>PLUG Solutions/);
  assert.match(html, /解決策をつなぎ/);
  assert.match(html, /地方企業の現場変革者にPowerを/);
  assert.match(html, /https:\/\/plug365\.github\.io\/PLUGGuide\//);
  assert.match(html, /https:\/\/plug\.connpass\.com\//);
  assert.match(html, /掲載作品を募集しています/);
  assert.doesNotMatch(html, /最初の作品|最初の掲載作品/);

  assert.doesNotMatch(html, /経費スナップ|Flow Triage|Field Log|余白日記/);
  assert.doesNotMatch(html, /VERIFIED MAKER|人が導入|今月の導入成功/);
  assert.doesNotMatch(html, /chatgpt\.site|oai-authenticated-user|codex-preview/);
});

test("exports a real 404 document and the Azure Static Web Apps configuration", async () => {
  const notFound = await readFile(new URL("out/404.html", root), "utf8");
  assert.match(notFound, /404 — NOT FOUND/);
  assert.match(notFound, /カタログへ戻る/);
  await access(new URL("out/staticwebapp.config.json", root));
  await assert.rejects(access(new URL("out/solutions/__build-validation__/", root)));
});

test("exports public guides without private review data", async () => {
  const home = await readFile(new URL("out/index.html", root), "utf8");
  const guide = await readFile(new URL("out/guide/index.html", root), "utf8");

  assert.match(home, /href="\/guide\/"/);
  assert.doesNotMatch(home, /href="\/lounge\/"/);
  assert.match(guide, /掲載を申し込む方へ/);
  assert.match(guide, /運営者の公開手順/);
  assert.match(guide, /申請.*審査.*PR.*本番公開/s);
  assert.doesNotMatch(guide, /ResponseId|ConsentAnswer|ReviewNotes|ThumbnailCandidateUrl/);
  assert.doesNotMatch(guide, /sharepoint\.com|Default-[a-f0-9-]{36}/i);
});

test("exports a closed-by-default lounge without an embedded third party frame", async () => {
  const lounge = await readFile(new URL("out/lounge/index.html", root), "utf8");
  const staticWebAppConfig = JSON.parse(
    await readFile(new URL("out/staticwebapp.config.json", root), "utf8"),
  );

  assert.match(lounge, /PLUG Lounge/);
  assert.match(lounge, /現在は閉室中/);
  assert.match(lounge, /name="robots" content="noindex, nofollow"/);
  assert.doesNotMatch(lounge, /<iframe/i);
  assert.match(
    staticWebAppConfig.globalHeaders["Content-Security-Policy"],
    /frame-src https:\/\/app\.chatexe\.net/,
  );
  assert.match(staticWebAppConfig.globalHeaders["Permissions-Policy"], /camera=\(\)/);
  assert.match(staticWebAppConfig.globalHeaders["Permissions-Policy"], /microphone=\(\)/);
  assert.match(staticWebAppConfig.globalHeaders["Permissions-Policy"], /display-capture=\(\)/);
});
