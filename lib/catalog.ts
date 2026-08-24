import { promises as fs } from "node:fs";
import path from "node:path";
import type { ReactionCounts, Solution } from "./catalog-types";
import {
  validateReactionCounts as validateReactionCountsData,
  validateSolution as validateSolutionData,
} from "./catalog-schema.mjs";

const solutionsDirectory = path.join(process.cwd(), "catalog", "solutions");
const reactionsFile = path.join(process.cwd(), "catalog", "reactions.json");

const validateSolution: (value: unknown, source?: string) => asserts value is Solution = validateSolutionData;
const validateReactionCounts: (
  value: unknown,
  knownSlugs: Set<string>,
  source?: string,
) => asserts value is ReactionCounts = validateReactionCountsData;

export async function getAllSolutions(): Promise<Solution[]> {
  const entries = await fs.readdir(solutionsDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  const solutions = await Promise.all(
    files.map(async (file) => {
      const raw: unknown = JSON.parse(await fs.readFile(path.join(solutionsDirectory, file), "utf8"));
      validateSolution(raw, file);
      if (`${raw.slug}.json` !== file) throw new Error(`${file}: filename must match slug`);
      return raw;
    }),
  );

  const slugs = new Set<string>();
  for (const solution of solutions) {
    if (slugs.has(solution.slug)) throw new Error(`duplicate slug: ${solution.slug}`);
    slugs.add(solution.slug);
  }

  return solutions.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSolution(slug: string): Promise<Solution | undefined> {
  return (await getAllSolutions()).find((solution) => solution.slug === slug);
}

export async function getReactionCounts(solutions: Solution[]): Promise<ReactionCounts> {
  const raw: unknown = JSON.parse(await fs.readFile(reactionsFile, "utf8"));
  validateReactionCounts(raw, new Set(solutions.map((solution) => solution.slug)), "reactions.json");
  return raw;
}
