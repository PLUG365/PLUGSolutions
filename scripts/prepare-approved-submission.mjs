import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSourceRevision,
  normalizeGraphItems,
  prepareNextApprovedSubmission,
  prepareWithdrawnSubmission,
  readFixtureItems,
  selectWithdrawnSubmission,
} from "../lib/prepare-approved-submission.mjs";

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function requiredEnvironment(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export async function fetchSharePointItems({ token, siteId, listId, fetchImpl = fetch }) {
  const items = [];
  let next = new URL(
    `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items`,
  );
  next.searchParams.set("$expand", "fields");
  next.searchParams.set("$top", "200");

  while (next) {
    const response = await fetchImpl(next, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      redirect: "error",
    });
    if (!response.ok) throw new Error(`Microsoft Graph list read failed with HTTP ${response.status}`);
    const page = await response.json();
    if (!Array.isArray(page.value)) throw new Error("Microsoft Graph list response is invalid");
    items.push(...page.value);
    next = page["@odata.nextLink"] ? new URL(page["@odata.nextLink"]) : null;
  }
  return normalizeGraphItems(items);
}

export async function run({ repositoryRoot = process.cwd() } = {}) {
  const fixturePath = option("--fixture");
  const requestedSlug = option("--slug") || String(process.env.REQUESTED_SLUG ?? "").trim() || null;
  const fieldsList = fixturePath
    ? await readFixtureItems(path.resolve(fixturePath))
    : await fetchSharePointItems({
        token: requiredEnvironment("GRAPH_TOKEN"),
        siteId: requiredEnvironment("PLUG_SHAREPOINT_SITE_ID"),
        listId: requiredEnvironment("PLUG_SUBMISSIONS_LIST_ID"),
      });

  const catalogDirectory = path.join(repositoryRoot, "catalog", "solutions");
  const withdrawnFields = await selectWithdrawnSubmission(fieldsList, { catalogDirectory, requestedSlug });
  const preparedApproved = withdrawnFields
    ? null
    : await prepareNextApprovedSubmission({ fieldsList, repositoryRoot, requestedSlug });
  const result = withdrawnFields
    ? { ...(await prepareWithdrawnSubmission({ fields: withdrawnFields, repositoryRoot })), operation: "remove" }
    : preparedApproved;
  const selectedFields = withdrawnFields ?? preparedApproved?.sourceFields;
  const sourceRevision = selectedFields ? createSourceRevision(selectedFields) : null;

  const resultDirectory = path.join(repositoryRoot, ".automation");
  await mkdir(resultDirectory, { recursive: true });
  await writeFile(
    path.join(resultDirectory, "approved-result.json"),
    `${JSON.stringify({
      status: result.status,
      operation: result.operation,
      slug: result.slug,
      thumbnailStatus: result.thumbnailStatus,
      sourceRevision,
    })}\n`,
  );
  console.log(
    result.status === "prepared"
      ? `Prepared catalog ${result.operation}: ${result.slug}`
      : "No catalog lifecycle change to prepare",
  );
  return result;
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
