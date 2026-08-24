import assert from "node:assert/strict";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import sharp from "sharp";
import {
  MAX_INPUT_BYTES,
  processThumbnail,
  THUMBNAIL_HEIGHT,
  THUMBNAIL_WIDTH,
} from "../scripts/thumbnail-lib.mjs";

async function makeWorkspace(t) {
  const workspace = await mkdtemp(path.join(tmpdir(), "plug-thumbnail-test-"));
  t.after(() => rm(workspace, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  }));
  return workspace;
}

test("creates a fixed-size WebP and removes EXIF metadata", async (t) => {
  const workspace = await makeWorkspace(t);
  const inputPath = path.join(workspace, "source.jpg");
  const outputRoot = path.join(workspace, "output");

  await sharp({
    create: { width: 640, height: 360, channels: 3, background: "#ff6846" },
  })
    .jpeg()
    .withExif({ IFD0: { Artist: "private test metadata" } })
    .toFile(inputPath);

  assert.ok((await sharp(inputPath).metadata()).exif);

  const result = await processThumbnail({ inputPath, slug: "field-helper", outputRoot });
  const metadata = await sharp(result.outputPath).metadata();

  assert.equal(result.publicPath, "/images/solutions/field-helper.webp");
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, THUMBNAIL_WIDTH);
  assert.equal(metadata.height, THUMBNAIL_HEIGHT);
  assert.equal(metadata.exif, undefined);
  assert.ok((await stat(result.outputPath)).size > 0);
});

test("rejects invalid slugs and unsupported image formats", async (t) => {
  const workspace = await makeWorkspace(t);
  const inputPath = path.join(workspace, "source.gif");

  await sharp({
    create: { width: 32, height: 32, channels: 3, background: "#c9ff56" },
  }).gif().toFile(inputPath);

  await assert.rejects(
    processThumbnail({ inputPath, slug: "../outside", outputRoot: workspace }),
    /slug must contain/,
  );
  await assert.rejects(
    processThumbnail({ inputPath, slug: "valid-slug", outputRoot: workspace }),
    /format must be PNG, JPEG, or WebP/,
  );
});

test("rejects files larger than 10 MB before decoding", async (t) => {
  const workspace = await makeWorkspace(t);
  const inputPath = path.join(workspace, "oversized.png");
  await writeFile(inputPath, Buffer.alloc(MAX_INPUT_BYTES + 1));

  await assert.rejects(
    processThumbnail({ inputPath, slug: "oversized", outputRoot: workspace }),
    /exceeds the 10 MB limit/,
  );
});
