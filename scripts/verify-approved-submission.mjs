import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSourceRevision,
  fetchSharePointItem,
} from "../lib/prepare-approved-submission.mjs";

function requiredEnvironment(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export async function run({ repositoryRoot = process.cwd(), fetchImpl = fetch } = {}) {
  const resultPath = path.join(repositoryRoot, ".automation", "approved-result.json");
  const result = JSON.parse(await readFile(resultPath, "utf8"));
  if (result.status !== "prepared" || !result.sourceRevision) {
    throw new Error("prepared SharePoint source revision is missing");
  }

  const currentItem = await fetchSharePointItem({
    token: requiredEnvironment("GRAPH_TOKEN"),
    siteId: requiredEnvironment("PLUG_SHAREPOINT_SITE_ID"),
    listId: requiredEnvironment("PLUG_SUBMISSIONS_LIST_ID"),
    itemId: result.sourceRevision.itemId,
    fetchImpl,
  });
  assertSourceRevision(result.sourceRevision, currentItem);
  console.log("SharePoint source revision is unchanged");
  return result.sourceRevision;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  try {
    await run();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
