import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { importApprovedSolution } from "../lib/import-approved-solution.mjs";

const validSolution = {
  schemaVersion: 1,
  slug: "approved-solution",
  title: "Approved Solution",
  maker: {
    displayName: "Approved Maker",
    xHandle: "@approved_maker",
    xUrl: "https://x.com/approved_maker",
  },
  description: "An approved catalog import fixture.",
  type: "Web App",
  categories: ["開発者ツール"],
  tags: ["test"],
  distributionUrl: "https://example.com/approved",
  sourceUrl: "https://github.com/example/approved",
  instructionsUrl: null,
  license: "MIT",
  cost: "無料",
  premiumRequired: false,
  setupTime: "約5分",
  prerequisites: [],
  thumbnail: null,
  publishedAt: "2026-08-25",
  updatedAt: "2026-08-25",
};

async function createFixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "plug-import-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const inputPath = path.join(root, "approved.json");
  const catalogDirectory = path.join(root, "catalog", "solutions");
  const publicDirectory = path.join(root, "public");
  await mkdir(publicDirectory, { recursive: true });
  await writeFile(inputPath, JSON.stringify(validSolution), "utf8");
  return { root, inputPath, catalogDirectory, publicDirectory };
}

test("validates an approved JSON without writing by default", async (t) => {
  const fixture = await createFixture(t);
  const result = await importApprovedSolution(fixture);

  assert.equal(result.slug, validSolution.slug);
  assert.equal(result.written, false);
  await assert.rejects(readFile(result.targetPath), /ENOENT/);
});

test("writes a canonical catalog JSON only with explicit write", async (t) => {
  const fixture = await createFixture(t);
  const result = await importApprovedSolution({ ...fixture, write: true });

  assert.equal(result.written, true);
  assert.equal(result.replaced, false);
  assert.deepEqual(JSON.parse(await readFile(result.targetPath, "utf8")), validSolution);
  assert.equal((await readFile(result.targetPath, "utf8")).endsWith("\n"), true);
});

test("rejects private fields without creating a catalog file", async (t) => {
  const fixture = await createFixture(t);
  await writeFile(fixture.inputPath, JSON.stringify({ ...validSolution, ResponseId: "1" }), "utf8");

  await assert.rejects(
    importApprovedSolution({ ...fixture, write: true }),
    /unknown or private field/,
  );
  await assert.rejects(readFile(path.join(fixture.catalogDirectory, `${validSolution.slug}.json`)), /ENOENT/);
});

test("preserves an existing slug unless replace is explicit", async (t) => {
  const fixture = await createFixture(t);
  await mkdir(fixture.catalogDirectory, { recursive: true });
  const targetPath = path.join(fixture.catalogDirectory, `${validSolution.slug}.json`);
  await writeFile(targetPath, "existing\n", "utf8");

  await assert.rejects(
    importApprovedSolution({ ...fixture, write: true }),
    /already exists/,
  );
  assert.equal(await readFile(targetPath, "utf8"), "existing\n");

  const result = await importApprovedSolution({ ...fixture, write: true, replace: true });
  assert.equal(result.replaced, true);
  assert.deepEqual(JSON.parse(await readFile(targetPath, "utf8")), validSolution);
});

test("rejects a missing processed thumbnail", async (t) => {
  const fixture = await createFixture(t);
  await writeFile(
    fixture.inputPath,
    JSON.stringify({ ...validSolution, thumbnail: "/images/solutions/approved-solution.webp" }),
    "utf8",
  );

  await assert.rejects(importApprovedSolution(fixture), /thumbnail does not exist/);
});
