import path from "node:path";
import { fileURLToPath } from "node:url";
import { importApprovedSolution } from "../lib/import-approved-solution.mjs";

function usage() {
  return [
    "Usage:",
    "  npm run import:solution -- --input <approved-json>",
    "  npm run import:solution -- --input <approved-json> --write",
    "  npm run import:solution -- --input <approved-json> --write --replace",
    "",
    "The default mode validates only. --write creates a new catalog file.",
    "Existing slugs require the explicit --replace option.",
  ].join("\n");
}

function parseArguments(args) {
  const options = { write: false, replace: false };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--input") {
      const input = args[index + 1];
      if (!input || input.startsWith("--")) throw new Error("--input requires a file path");
      options.inputPath = path.resolve(input);
      index += 1;
    } else if (argument === "--write") {
      options.write = true;
    } else if (argument === "--replace") {
      options.replace = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`unknown option: ${argument}`);
    }
  }

  return options;
}

const options = parseArguments(process.argv.slice(2));
if (options.help) {
  console.log(usage());
  process.exit(0);
}
if (!options.inputPath) throw new Error(`--input is required\n\n${usage()}`);

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = await importApprovedSolution({
  ...options,
  catalogDirectory: path.join(repositoryRoot, "catalog", "solutions"),
  publicDirectory: path.join(repositoryRoot, "public"),
});

console.log(`${result.written ? (result.replaced ? "Replaced" : "Imported") : "Validated"}: ${result.slug}`);
console.log(`Target: ${path.relative(process.cwd(), result.targetPath) || result.targetPath}`);
if (!result.written && result.targetExists) {
  console.log("The target already exists. Review it before using --write --replace.");
}
