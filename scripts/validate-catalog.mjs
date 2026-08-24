import { readFile, readdir } from "node:fs/promises";
import { validateReactionCounts, validateSolution } from "../lib/catalog-schema.mjs";

const directory = new URL("../catalog/solutions/", import.meta.url);
const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
const slugs = new Set();

for (const file of files) {
  const value = JSON.parse(await readFile(new URL(file, directory), "utf8"));
  validateSolution(value, file);
  if (file !== `${value.slug}.json`) throw new Error(`${file}: filename must match slug`);
  if (slugs.has(value.slug)) throw new Error(`duplicate slug: ${value.slug}`);
  slugs.add(value.slug);
}

const reactions = JSON.parse(await readFile(new URL("../catalog/reactions.json", import.meta.url), "utf8"));
validateReactionCounts(reactions, slugs, "reactions.json");
console.log(`Catalog validation passed: ${files.length} solution(s), ${Object.keys(reactions).length} reaction aggregate(s).`);
