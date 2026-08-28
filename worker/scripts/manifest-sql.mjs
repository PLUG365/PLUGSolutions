import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../../public/reaction-manifest.json", import.meta.url), "utf8"));
const slugs = [...new Set(manifest.slugs)];
if (!slugs.length || slugs.some((slug) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
  throw new Error("manifest must contain at least one valid slug");
}
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
console.log([
  "UPDATE solution_slugs SET active = 0;",
  ...slugs.map((slug) => `INSERT INTO solution_slugs (slug, active) VALUES (${quote(slug)}, 1) ON CONFLICT(slug) DO UPDATE SET active = 1;`),
].join("\n"));
