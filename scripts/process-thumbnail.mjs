import path from "node:path";
import { fileURLToPath } from "node:url";
import { processThumbnail } from "./thumbnail-lib.mjs";

const [, , inputPath, slug, outputRoot] = process.argv;

if (!inputPath || !slug) {
  console.error("Usage: npm run thumbnail -- <input.png|jpg|webp> <slug> [output-directory]");
  process.exitCode = 1;
} else {
  try {
    const result = await processThumbnail({ inputPath, slug, outputRoot });
    console.log(`Created ${result.publicPath}`);
    console.log(`${result.width}x${result.height} ${result.format}, ${result.size} bytes`);
    console.log(`File: ${path.relative(process.cwd(), result.outputPath)}`);
  } catch (error) {
    const scriptName = path.basename(fileURLToPath(import.meta.url));
    console.error(`${scriptName}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
