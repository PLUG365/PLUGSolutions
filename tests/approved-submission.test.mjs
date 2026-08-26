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
} from "../lib/approved-submission.mjs";
import {
  assertSourceRevision,
  createSourceRevision,
  fetchSharePointItem,
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
    CatalogType: "web",
    CatalogCategories: "業務改善\n現場DX",
    CatalogTags: "Power Platform\nAI",
    DistributionUrl: "https://example.com/tool",
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
  assert.deepEqual(result.categories, ["業務改善", "現場DX"]);
  assert.equal(result.maker.xUrl, "https://x.com/plug_maker");
  assert.equal(result.premiumRequired, false);
  assert.doesNotThrow(() => assertNoPrivateFields(result));
  const serialized = JSON.stringify(result);
  for (const privateValue of ["private-response-id", "private-consent", "private-review-note", "private-candidate"]) {
    assert.doesNotMatch(serialized, new RegExp(privateValue));
  }
});

test("SharePoint timestamps are converted to their Asia/Tokyo calendar date", () => {
  const result = buildPublicSolution(
    approvedFields({
      CatalogPublishedDate: "2026-08-25T15:00:00Z",
      CatalogUpdatedDate: "2026-08-25T15:00:00.000Z",
    }),
  );
  assert.equal(result.publishedAt, "2026-08-26");
  assert.equal(result.updatedAt, "2026-08-26");

  assert.equal(
    buildPublicSolution(
      approvedFields({
        CatalogPublishedDate: "2026-08-26",
        CatalogUpdatedDate: "2026-08-26",
      }),
    ).publishedAt,
    "2026-08-26",
  );
  assert.throws(
    () => buildPublicSolution(approvedFields({ CatalogPublishedDate: "2026-08-26Tinvalid" })),
    /ISO timestamp/,
  );
});

test("invalid required public fields are rejected before writing", () => {
  assert.throws(
    () => buildPublicSolution(approvedFields({ CatalogCategories: "" })),
    /CatalogCategories/,
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
