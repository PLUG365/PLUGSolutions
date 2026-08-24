import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { validateReactionCounts, validateSolution } from "../lib/catalog-schema.mjs";

const validSolution = {
  schemaVersion: 1,
  slug: "sample-solution",
  title: "Sample Solution",
  maker: {
    displayName: "Sample Maker",
    xHandle: "@sample_maker",
    xUrl: "https://x.com/sample_maker"
  },
  description: "A portable sample for schema tests.",
  type: "Web App",
  categories: ["開発者ツール"],
  tags: ["OSS"],
  distributionUrl: "https://example.com/sample",
  sourceUrl: "https://github.com/example/sample",
  instructionsUrl: null,
  license: "MIT",
  cost: "無料",
  premiumRequired: null,
  setupTime: "約5分",
  prerequisites: [],
  thumbnail: "/images/solutions/sample-solution.webp",
  publishedAt: "2026-08-01",
  updatedAt: "2026-08-23"
};

test("accepts the public solution schema", () => {
  assert.equal(validateSolution(structuredClone(validSolution)).slug, "sample-solution");
});

test("rejects private review fields and non-HTTPS URLs", () => {
  assert.throws(
    () => validateSolution({ ...structuredClone(validSolution), responseId: "123" }),
    /unknown or private field|forbidden public field/,
  );
  assert.throws(
    () => validateSolution({ ...structuredClone(validSolution), distributionUrl: "http://example.com" }),
    /must use HTTPS/,
  );
});

test("rejects invalid slugs, dates, thumbnails, and X profiles", () => {
  assert.throws(() => validateSolution({ ...structuredClone(validSolution), slug: "Bad Slug" }), /slug format/);
  assert.throws(() => validateSolution({ ...structuredClone(validSolution), updatedAt: "2026/08/23" }), /YYYY-MM-DD/);
  assert.throws(() => validateSolution({ ...structuredClone(validSolution), thumbnail: "https://example.com/hotlink.png" }), /local/);
  assert.throws(
    () => validateSolution({ ...structuredClone(validSolution), maker: { ...validSolution.maker, xUrl: "https://example.com/user" } }),
    /x\.com/,
  );
});

test("accepts only aggregate reaction counts for known solutions", () => {
  const slugs = new Set(["sample-solution"]);
  assert.deepEqual(
    validateReactionCounts({ "sample-solution": { interested: 2, tried: 1, adopted: 0 } }, slugs),
    { "sample-solution": { interested: 2, tried: 1, adopted: 0 } },
  );
  assert.throws(
    () => validateReactionCounts({ unknown: { interested: 1, tried: 0, adopted: 0 } }, slugs),
    /unknown solution slug/,
  );
  assert.throws(
    () => validateReactionCounts({ "sample-solution": { interested: 1, tried: 0, adopted: 0, responseId: "1" } }, slugs),
    /invalid reaction fields/,
  );
});

test("all repository catalog records are valid, unique, and match filenames", async () => {
  const catalogDirectory = new URL("../catalog/solutions/", import.meta.url);
  const files = (await readdir(catalogDirectory)).filter((file) => file.endsWith(".json")).sort();
  const slugs = new Set();

  for (const file of files) {
    const value = JSON.parse(await readFile(new URL(file, catalogDirectory), "utf8"));
    validateSolution(value, file);
    assert.equal(file, `${value.slug}.json`);
    assert.equal(slugs.has(value.slug), false, `duplicate slug: ${value.slug}`);
    slugs.add(value.slug);
  }

  const reactions = JSON.parse(await readFile(new URL("../catalog/reactions.json", import.meta.url), "utf8"));
  validateReactionCounts(reactions, slugs, "reactions.json");
});
