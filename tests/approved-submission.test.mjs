import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  assertNoPrivateFields,
  buildPublicSolution,
  isApprovedSubmission,
  isWithdrawnSubmission,
  normalizeTypesAndUses,
  normalizeRelatedUrls,
  normalizeThumbnailCandidateUrl,
} from "../lib/approved-submission.mjs";
import {
  assertSourceRevision,
  createSourceRevision,
  fetchSharePointItem,
  prepareNextApprovedSubmission,
  prepareApprovedSubmission,
  prepareWithdrawnSubmission,
  normalizeGraphItems,
  selectApprovedSubmission,
  selectWithdrawnSubmission,
} from "../lib/prepare-approved-submission.mjs";
import { UnsafeImageUrlError } from "../lib/public-image-url.mjs";

function approvedFields(overrides = {}) {
  return {
    ID: "42",
    ReviewStatus: "承認",
    ResponseId: "private-response-id",
    ConsentAnswer: "private-consent",
    ReviewNotes: "private-review-note",
    SubmittedAt: "2026-08-25T01:00:00Z",
    ReviewedAt: "2026-08-26T01:00:00Z",
    ThumbnailCandidateUrl: "https://images.example.com/private-candidate.png",
    Slug: "field-tool",
    Title: "現場ツール",
    MakerDisplayName: "PLUG Maker",
    XHandle: "@plug_maker",
    Description: "現場で使えるツールです。",
    TypesAndUses: "Web アプリ\n仕事効率化",
    CatalogType: "web",
    CatalogCategories: "業務改善\n現場DX",
    CatalogTags: "Power Platform\nAI",
    DistributionUrl: "https://example.com/tool",
    RelatedUrls: "ソース: https://github.com/example/tool\n手順: https://example.com/tool/setup",
    SourceUrl: "https://github.com/example/tool",
    InstructionsUrl: "https://example.com/tool/setup",
    CatalogLicense: "MIT",
    CatalogCost: "無料",
    PremiumRequired: "不要",
    SetupTime: "10分",
    CatalogPrerequisites: "Microsoft 365",
    CatalogPublishedDate: "2026-08-25T00:00:00Z",
    CatalogUpdatedDate: "2026-08-26T00:00:00Z",
    ...overrides,
  };
}

function graphItem(overrides = {}) {
  return {
    id: "42",
    eTag: '"7"',
    lastModifiedDateTime: "2026-08-26T01:00:00Z",
    fields: approvedFields(),
    ...overrides,
  };
}

test("Graph normalization retains an internal read-only source revision", () => {
  const [fields] = normalizeGraphItems([graphItem()]);
  assert.deepEqual(fields.__sourceRevision, {
    itemId: "42",
    eTag: '"7"',
    lastModifiedDateTime: "2026-08-26T01:00:00Z",
    reviewStatus: "承認",
    slug: "field-tool",
  });
  assert.doesNotMatch(JSON.stringify(buildPublicSolution(fields)), /__sourceRevision|"7"/);

  const [unreviewed] = normalizeGraphItems([
    graphItem({ fields: approvedFields({ ReviewStatus: "未審査", Slug: "" }) }),
  ]);
  assert.equal(unreviewed.__sourceRevision.slug, "");
});

test("source revision verification accepts only the same item, state, slug, and version", () => {
  const expected = createSourceRevision(normalizeGraphItems([graphItem()])[0]);
  assert.doesNotThrow(() => assertSourceRevision(expected, graphItem()));

  for (const [label, current] of [
    ["item", graphItem({ id: "43" })],
    ["etag", graphItem({ eTag: '"8"' })],
    ["modified", graphItem({ lastModifiedDateTime: "2026-08-26T01:00:01Z" })],
    ["status", graphItem({ fields: approvedFields({ ReviewStatus: "要確認" }) })],
    ["slug", graphItem({ fields: approvedFields({ Slug: "changed-tool" }) })],
  ]) {
    assert.throws(() => assertSourceRevision(expected, current), new RegExp(label, "i"));
  }
});

test("single-item Graph read is GET-only and fails closed", async () => {
  const calls = [];
  const item = await fetchSharePointItem({
    token: "masked-token",
    siteId: "site-id",
    listId: "list-id",
    itemId: "42",
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return { ok: true, status: 200, json: async () => graphItem() };
    },
  });
  assert.equal(item.id, "42");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "GET");
  assert.match(calls[0].url, /\/items\/42/);
  assert.doesNotMatch(JSON.stringify(calls), /PATCH|POST|PUT|DELETE/);

  await assert.rejects(
    fetchSharePointItem({
      token: "masked-token",
      siteId: "site-id",
      listId: "list-id",
      itemId: "42",
      fetchImpl: async () => ({ ok: false, status: 404 }),
    }),
    /HTTP 404/,
  );
});

test("only approved SharePoint rows are eligible", () => {
  assert.equal(isApprovedSubmission(approvedFields()), true);
  assert.equal(isApprovedSubmission(approvedFields({ ReviewStatus: "要確認" })), false);
  assert.throws(
    () => buildPublicSolution(approvedFields({ ReviewStatus: "却下" })),
    /not approved/,
  );
});

test("only withdrawn SharePoint rows are eligible for catalog removal", () => {
  assert.equal(isWithdrawnSubmission(approvedFields({ ReviewStatus: "取り下げ" })), true);
  assert.equal(isWithdrawnSubmission(approvedFields({ ReviewStatus: "公開済み" })), false);
});

test("public solution is allowlisted and excludes review fields", () => {
  const result = buildPublicSolution(approvedFields(), { thumbnail: null });
  assert.equal(result.slug, "field-tool");
  assert.deepEqual(result.categories, ["仕事効率化"]);
  assert.equal(result.maker.xUrl, "https://x.com/plug_maker");
  assert.equal(result.premiumRequired, null);
  assert.doesNotThrow(() => assertNoPrivateFields(result));
  const serialized = JSON.stringify(result);
  for (const privateValue of ["private-response-id", "private-consent", "private-review-note", "private-candidate"]) {
    assert.doesNotMatch(serialized, new RegExp(privateValue));
  }
});

test("only canonical GitHub blob thumbnails are converted to raw URLs", () => {
  assert.equal(
    normalizeThumbnailCandidateUrl("https://github.com/PLUG365/PLUGSolutions/blob/main/public/a.png?raw=1#x"),
    "https://raw.githubusercontent.com/PLUG365/PLUGSolutions/main/public/a.png",
  );
  for (const value of [
    "https://github.com/PLUG365/PLUGSolutions/tree/main/public/a.png",
    "https://github.com.evil/PLUG365/PLUGSolutions/blob/main/a.png",
    "http://github.com/PLUG365/PLUGSolutions/blob/main/a.png",
    "https://github.com/PLUG 365/PLUGSolutions/blob/main/a.png",
    "https://github.com/PLUG365/PLUGSolutions/blob/main/../a.png",
  ]) assert.equal(normalizeThumbnailCandidateUrl(value), value);
});

test("Q6 accepts その他 deterministically but rejects unknown choices", () => {
  const normalized = normalizeTypesAndUses(["その他", "Web", "その他", "学習"]);
  assert.deepEqual(normalized, {
    status: "ok",
    type: "Web アプリ / その他",
    tags: ["Web アプリ", "その他"],
    categories: ["学習", "その他"],
  });
  assert.equal(normalizeTypesAndUses(["未知の選択肢"]).status, "要確認");
  assert.deepEqual(normalizeTypesAndUses([]), {
    status: "ok",
    type: "その他",
    tags: [],
    categories: ["その他"],
  });
});

test("normalizes Forms choices and labeled related URLs", () => {
  assert.deepEqual(
    normalizeTypesAndUses(["Web", "仕事効率化", "Web"]),
    {
      status: "ok",
      type: "Web アプリ",
      tags: ["Web アプリ"],
      categories: ["仕事効率化"],
    },
  );
  assert.equal(normalizeTypesAndUses(["未知の選択肢"]).status, "要確認");
  assert.deepEqual(
    normalizeRelatedUrls("ソース: https://github.com/PLUG365/PLUGSolutions\r\n手順: https://example.com/setup"),
    {
      status: "ok",
      sourceUrl: "https://github.com/PLUG365/PLUGSolutions",
      instructionsUrl: "https://example.com/setup",
      relatedUrls: [
        "https://github.com/PLUG365/PLUGSolutions",
        "https://example.com/setup",
      ],
    },
  );
  assert.deepEqual(
    normalizeRelatedUrls([
      "https://github.com/PLUG365/DecisionFlow",
      "https://www.youtube.com/watch?v=C-c9nRtaVm4&t=8s",
      "https://qiita.com/meccha__eeyan/items/9b21cf93514fc04a53c7",
    ]),
    {
      status: "ok",
      sourceUrl: null,
      instructionsUrl: null,
      relatedUrls: [
        "https://github.com/PLUG365/DecisionFlow",
        "https://www.youtube.com/watch?v=C-c9nRtaVm4&t=8s",
        "https://qiita.com/meccha__eeyan/items/9b21cf93514fc04a53c7",
      ],
    },
  );
  assert.deepEqual(
    normalizeRelatedUrls("手順: https://example.com/setup\nhttps://www.youtube.com/watch?v=abc"),
    {
      status: "ok",
      sourceUrl: null,
      instructionsUrl: "https://example.com/setup",
      relatedUrls: ["https://example.com/setup", "https://www.youtube.com/watch?v=abc"],
    },
  );
  assert.equal(normalizeRelatedUrls("ソース: http://example.com").status, "要確認");
  assert.equal(normalizeRelatedUrls("ソース: https://a.example\nソース: https://b.example").status, "要確認");
  assert.deepEqual(
    normalizeTypesAndUses('["Power Apps","Copilot Studio","Power Automate","Dataverse solution／PCF","デスクトップアプリ","モバイルアプリ","仕事効率化","コミュニケーション"]'),
    {
      status: "ok",
      type: "Power Apps / Copilot Studio / Power Automate / Dataverse solution／PCF / モバイル／デスクトップアプリ",
      tags: ["Power Apps", "Copilot Studio", "Power Automate", "Dataverse solution／PCF", "モバイル／デスクトップアプリ"],
      categories: ["仕事効率化", "コミュニケーション"],
    },
  );
});

test("raw Forms values take precedence over legacy normalized columns", () => {
  const result = buildPublicSolution(
    approvedFields({
      TypesAndUses: ["Web アプリ", "仕事効率化", "学習"],
      RelatedUrls: "ソース: https://github.com/PLUG365/PLUGSolutions\n手順: https://example.com/setup",
      CatalogType: "legacy",
      CatalogCategories: "legacy",
      CatalogTags: "legacy",
      SourceUrl: "https://legacy.example/source",
      InstructionsUrl: "https://legacy.example/setup",
    }),
  );
  assert.equal(result.type, "Web アプリ");
  assert.deepEqual(result.categories, ["仕事効率化", "学習"]);
  assert.deepEqual(result.tags, ["Web アプリ"]);
  assert.equal(result.sourceUrl, "https://github.com/PLUG365/PLUGSolutions");
  assert.equal(result.instructionsUrl, "https://example.com/setup");
  assert.deepEqual(result.relatedUrls, [
    "https://github.com/PLUG365/PLUGSolutions",
    "https://example.com/setup",
  ]);
});

test("completes a missing X prefix and applies post-P08 safe defaults", () => {
  const result = buildPublicSolution(
    approvedFields({
      XHandle: "plug_maker",
      CatalogLicense: "",
      CatalogCost: "",
      PremiumRequired: "",
      SetupTime: "",
      CatalogPrerequisites: "",
    }),
  );
  assert.equal(result.maker.xHandle, "@plug_maker");
  assert.equal(result.license, "配布先を確認");
  assert.equal(result.cost, "配布先を確認");
  assert.equal(result.premiumRequired, null);
  assert.equal(result.setupTime, "未記載");
  assert.deepEqual(result.prerequisites, []);
});

test("preparation supplies stable publication dates when legacy columns are blank", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "plug-date-default-test-"));
  try {
    const fields = approvedFields({
      CatalogPublishedDate: "",
      CatalogUpdatedDate: "",
      ReviewedAt: "2026-08-26T01:00:00Z",
      ThumbnailCandidateUrl: "",
    });
    const result = await prepareApprovedSubmission({ fields, repositoryRoot: root });
    const json = JSON.parse(await readFile(result.catalogPath, "utf8"));
    assert.equal(json.publishedAt, "2026-08-26");
    assert.equal(json.updatedAt, "2026-08-26");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("publication dates use ReviewedAt and ignore legacy Catalog date columns", () => {
  const result = buildPublicSolution(
    approvedFields({
      ReviewedAt: "2026-08-25T15:00:00Z",
      CatalogPublishedDate: "2026-08-25T15:00:00Z",
      CatalogUpdatedDate: "2026-08-25T15:00:00.000Z",
    }),
  );
  assert.equal(result.publishedAt, "2026-08-26");
  assert.equal(result.updatedAt, "2026-08-26");

  assert.doesNotThrow(() => buildPublicSolution(approvedFields({
    CatalogPublishedDate: "not-a-date",
    CatalogUpdatedDate: "also-not-a-date",
  })));
});

test("invalid required public fields are rejected before writing", () => {
  assert.throws(
    () => buildPublicSolution(approvedFields({ TypesAndUses: "" })),
    /TypesAndUses/,
  );
  assert.throws(
    () => buildPublicSolution(approvedFields({ DistributionUrl: "http://example.com" })),
    /HTTPS/,
  );
});

test("approved submission writes sanitized JSON and processed WebP", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "plug-approved-test-"));
  try {
    const png = await sharp({
      create: { width: 80, height: 40, channels: 4, background: "#b7ff3c" },
    })
      .png()
      .toBuffer();
    const result = await prepareApprovedSubmission({
      fields: approvedFields(),
      repositoryRoot: root,
      downloadImage: async () => ({ bytes: png, contentType: "image/png" }),
    });
    assert.equal(result.thumbnailStatus, "processed");
    const json = JSON.parse(await readFile(result.catalogPath, "utf8"));
    assert.equal(json.thumbnail, "/images/solutions/field-tool.webp");
    assert.equal((await sharp(result.imagePath).metadata()).width, 1200);
    assert.doesNotMatch(JSON.stringify(json), /ThumbnailCandidateUrl|private-candidate/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("generates a stable-safe slug only for a direct empty-slug preparation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "plug-empty-slug-test-"));
  try {
    const fields = approvedFields({ Slug: "", ThumbnailCandidateUrl: "" });
    const first = await prepareApprovedSubmission({ fields, repositoryRoot: root });
    const secondSlug = fields.Slug;
    assert.match(first.slug, /^solution-[a-f0-9]{32}$/);
    assert.equal(secondSlug, first.slug);
    await assert.rejects(
      prepareApprovedSubmission({ fields, repositoryRoot: root }),
      /catalog slug already exists/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("ordinary image failure falls back, while unsafe URL rejection writes nothing", async () => {
  const fallbackRoot = await mkdtemp(path.join(os.tmpdir(), "plug-fallback-test-"));
  const unsafeRoot = await mkdtemp(path.join(os.tmpdir(), "plug-unsafe-test-"));
  try {
    const fallback = await prepareApprovedSubmission({
      fields: approvedFields(),
      repositoryRoot: fallbackRoot,
      downloadImage: async () => {
        throw new Error("remote image unavailable");
      },
    });
    assert.equal(fallback.thumbnailStatus, "fallback");
    assert.equal(JSON.parse(await readFile(fallback.catalogPath, "utf8")).thumbnail, null);

    await assert.rejects(
      prepareApprovedSubmission({
        fields: approvedFields(),
        repositoryRoot: unsafeRoot,
        downloadImage: async () => {
          throw new UnsafeImageUrlError("non-public address");
        },
      }),
      UnsafeImageUrlError,
    );
    await assert.rejects(
      readFile(path.join(unsafeRoot, "catalog", "solutions", "field-tool.json"), "utf8"),
      /ENOENT/,
    );
  } finally {
    await rm(fallbackRoot, { recursive: true, force: true });
    await rm(unsafeRoot, { recursive: true, force: true });
  }
});

test("reconciles changed approved Forms data while leaving unchanged catalog files alone", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "plug-reconcile-test-"));
  try {
    const first = approvedFields({ ID: "1", Slug: "first-tool", ThumbnailCandidateUrl: "" });
    const second = approvedFields({ ID: "2", Slug: "second-tool", ThumbnailCandidateUrl: "" });
    await prepareApprovedSubmission({ fields: first, repositoryRoot: root });
    await prepareApprovedSubmission({ fields: second, repositoryRoot: root });

    const changedSecond = { ...second, Description: "SharePointのForms原文で更新された概要です。" };
    const result = await prepareNextApprovedSubmission({
      fieldsList: [first, changedSecond],
      repositoryRoot: root,
    });

    assert.equal(result.status, "prepared");
    assert.equal(result.operation, "update");
    assert.equal(result.slug, "second-tool");
    assert.equal(
      JSON.parse(await readFile(path.join(root, "catalog", "solutions", "first-tool.json"))).description,
      first.Description,
    );
    assert.equal(
      JSON.parse(await readFile(path.join(root, "catalog", "solutions", "second-tool.json"))).description,
      changedSecond.Description,
    );

    const unchanged = await prepareNextApprovedSubmission({
      fieldsList: [first],
      repositoryRoot: root,
    });
    assert.equal(unchanged.status, "none");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("selection skips unapproved and existing slugs without overwriting", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "plug-selection-test-"));
  const catalogDirectory = path.join(root, "catalog");
  try {
    await mkdir(catalogDirectory, { recursive: true });
    await writeFile(path.join(catalogDirectory, "existing.json"), "{}\n");
    const selected = await selectApprovedSubmission(
      [
        approvedFields({ ID: "1", ReviewStatus: "未審査", Slug: "unapproved" }),
        approvedFields({ ID: "2", Slug: "existing" }),
        approvedFields({ ID: "3", Slug: "next-item" }),
      ],
      { catalogDirectory },
    );
    assert.equal(selected.Slug, "next-item");
    await assert.rejects(
      selectApprovedSubmission([], {
        catalogDirectory,
        requestedSlug: "../unsafe",
      }),
      /invalid slug/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("withdrawal selection requires an existing catalog slug and rejects unsafe slugs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "plug-withdraw-selection-test-"));
  try {
    await mkdir(root, { recursive: true });
    await writeFile(path.join(root, "existing.json"), "{}\n");
    const selected = await selectWithdrawnSubmission(
      [
        approvedFields({ ID: "1", ReviewStatus: "公開済み", Slug: "existing" }),
        approvedFields({ ID: "2", ReviewStatus: "取り下げ", Slug: "missing" }),
        approvedFields({ ID: "3", ReviewStatus: "取り下げ", Slug: "existing" }),
      ],
      { catalogDirectory: root },
    );
    assert.equal(selected.ID, "3");
    await assert.rejects(
      selectWithdrawnSubmission(
        [approvedFields({ ReviewStatus: "取り下げ", Slug: "../unsafe" })],
        { catalogDirectory: root },
      ),
      /invalid slug/,
    );
    await assert.rejects(
      selectWithdrawnSubmission([], {
        catalogDirectory: root,
        requestedSlug: "../unsafe",
      }),
      /invalid slug/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("withdrawal removes only the validated catalog JSON and matching thumbnail", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "plug-withdraw-test-"));
  const catalogDirectory = path.join(root, "catalog", "solutions");
  const imageDirectory = path.join(root, "public", "images", "solutions");
  try {
    await mkdir(catalogDirectory, { recursive: true });
    await mkdir(imageDirectory, { recursive: true });
    const solution = buildPublicSolution(approvedFields(), {
      thumbnail: "/images/solutions/field-tool.webp",
    });
    const catalogPath = path.join(catalogDirectory, "field-tool.json");
    const imagePath = path.join(imageDirectory, "field-tool.webp");
    await writeFile(catalogPath, `${JSON.stringify(solution, null, 2)}\n`);
    await writeFile(imagePath, "processed-image");
    const result = await prepareWithdrawnSubmission({
      fields: approvedFields({ ReviewStatus: "取り下げ" }),
      repositoryRoot: root,
    });
    assert.equal(result.operation, "remove");
    assert.equal(result.thumbnailStatus, "removed");
    await assert.rejects(readFile(catalogPath), /ENOENT/);
    await assert.rejects(readFile(imagePath), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("withdrawal removes a catalog item that uses the text-thumbnail fallback", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "plug-withdraw-fallback-test-"));
  const catalogDirectory = path.join(root, "catalog", "solutions");
  try {
    await mkdir(catalogDirectory, { recursive: true });
    const catalogPath = path.join(catalogDirectory, "field-tool.json");
    await writeFile(
      catalogPath,
      `${JSON.stringify(buildPublicSolution(approvedFields(), { thumbnail: null }), null, 2)}\n`,
    );
    const result = await prepareWithdrawnSubmission({
      fields: approvedFields({ ReviewStatus: "取り下げ" }),
      repositoryRoot: root,
    });
    assert.equal(result.thumbnailStatus, "not-present");
    await assert.rejects(readFile(catalogPath), /ENOENT/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("withdrawal fails closed for a mismatched thumbnail without deleting files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "plug-withdraw-mismatch-test-"));
  const catalogDirectory = path.join(root, "catalog", "solutions");
  try {
    await mkdir(catalogDirectory, { recursive: true });
    const solution = buildPublicSolution(approvedFields(), {
      thumbnail: "/images/solutions/another-item.webp",
    });
    const catalogPath = path.join(catalogDirectory, "field-tool.json");
    await writeFile(catalogPath, `${JSON.stringify(solution, null, 2)}\n`);
    await assert.rejects(
      prepareWithdrawnSubmission({
        fields: approvedFields({ ReviewStatus: "取り下げ" }),
        repositoryRoot: root,
      }),
      /does not match withdrawn slug/,
    );
    assert.equal(JSON.parse(await readFile(catalogPath, "utf8")).slug, "field-tool");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
