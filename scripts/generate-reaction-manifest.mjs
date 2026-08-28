import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const solutionsDirectory = path.join(root, "catalog", "solutions");
const outputPath = path.join(root, "public", "reaction-manifest.json");

const entries = await fs.readdir(solutionsDirectory, { withFileTypes: true });
const slugs = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
  .map((entry) => entry.name.slice(0, -5))
  .sort();

await fs.writeFile(outputPath, `${JSON.stringify({ version: 1, slugs }, null, 2)}\n`, "utf8");
console.log(`Reaction manifest generated: ${slugs.length} slug(s)`);
