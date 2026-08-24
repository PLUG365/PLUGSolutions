import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Avoid libvips retaining input/output file handles in this short-lived local tool.
sharp.cache({ files: 0 });

export const THUMBNAIL_WIDTH = 1200;
export const THUMBNAIL_HEIGHT = 675;
export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_INPUT_PIXELS = 25_000_000;
export const THUMBNAIL_QUALITY = 82;

const allowedFormats = new Set(["jpeg", "png", "webp"]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertSlug(slug) {
  if (!slugPattern.test(slug)) {
    throw new Error("slug must contain lowercase ASCII letters, numbers, and single hyphens only");
  }
}

export async function processThumbnail({ inputPath, slug, outputRoot }) {
  assertSlug(slug);

  const resolvedInput = path.resolve(inputPath);
  const resolvedOutputRoot = path.resolve(outputRoot ?? "public/images/solutions");
  const inputStat = await stat(resolvedInput);

  if (!inputStat.isFile()) throw new Error("input must be a file");
  if (inputStat.size > MAX_INPUT_BYTES) throw new Error("input exceeds the 10 MB limit");

  const input = sharp(resolvedInput, {
    failOn: "warning",
    limitInputPixels: MAX_INPUT_PIXELS,
  });
  const metadata = await input.metadata();

  if (!allowedFormats.has(metadata.format)) {
    throw new Error("input format must be PNG, JPEG, or WebP");
  }
  if (!metadata.width || !metadata.height) throw new Error("input dimensions could not be read");
  if (metadata.width * metadata.height > MAX_INPUT_PIXELS) {
    throw new Error("input exceeds the 25 MP limit");
  }

  await mkdir(resolvedOutputRoot, { recursive: true });
  const outputPath = path.join(resolvedOutputRoot, `${slug}.webp`);

  await input
    .rotate()
    .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
      fit: "contain",
      background: { r: 244, g: 240, b: 230, alpha: 1 },
    })
    .webp({ quality: THUMBNAIL_QUALITY })
    .toFile(outputPath);

  const outputMetadata = await sharp(outputPath).metadata();
  if (
    outputMetadata.format !== "webp" ||
    outputMetadata.width !== THUMBNAIL_WIDTH ||
    outputMetadata.height !== THUMBNAIL_HEIGHT
  ) {
    throw new Error("processed thumbnail failed output validation");
  }
  if (outputMetadata.exif || outputMetadata.xmp || outputMetadata.iptc) {
    throw new Error("processed thumbnail still contains removable metadata");
  }

  return {
    outputPath,
    publicPath: `/images/solutions/${slug}.webp`,
    width: outputMetadata.width,
    height: outputMetadata.height,
    format: outputMetadata.format,
    size: (await stat(outputPath)).size,
  };
}
