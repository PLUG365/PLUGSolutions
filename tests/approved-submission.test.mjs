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
} from "../lib/approved-submission.mjs";
import {
  prepareApprovedSubmission,
  selectApprovedSubmission,
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

test("only approved SharePoint rows are eligible", () => {
  assert.equal(isApprovedSubmission(approvedFields()), true);
  assert.equal(isApprovedSubmission(approvedFields({ ReviewStatus: "要確認" })), false);
  assert.throws(
    () => buildPublicSolution(approvedFields({ ReviewStatus: "却下" })),
    /not approved/,
  );
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
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
