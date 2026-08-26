import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertNoPrivateFields,
  buildPublicSolution,
  getThumbnailCandidateUrl,
  isApprovedSubmission,
  isWithdrawnSubmission,
} from "./approved-submission.mjs";
import { validateSolution } from "./catalog-schema.mjs";
import { downloadPublicImage, UnsafeImageUrlError } from "./public-image-url.mjs";
import { processThumbnail } from "../scripts/thumbnail-lib.mjs";

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function requireSafeSlug(value, source) {
  const slug = String(value ?? "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`${source} has an invalid slug: ${slug || "(blank)"}`);
  }
  return slug;
}

export function normalizeGraphItems(items) {
  if (!Array.isArray(items)) throw new Error("SharePoint response must contain an item array");
  return items.map((item) => ({
    ...item.fields,
    ID: item.fields?.ID ?? item.id,
    __sourceRevision: sourceRevisionFromGraphItem(item, { requireSlug: false }),
  }));
}

function requiredRevisionValue(value, name) {
  const normalized = String(value ?? "").trim();
  if (!normalized || /[\r\n]/.test(normalized)) {
    throw new Error(`SharePoint source ${name} is missing or invalid`);
  }
  return normalized;
}

function reviewStatusValue(value) {
  return String(value?.Value ?? value ?? "").trim();
}

function sourceRevisionFromGraphItem(item, { requireSlug = true } = {}) {
  const slug = String(item?.fields?.Slug ?? "").trim();
  return {
    itemId: requiredRevisionValue(item?.id ?? item?.fields?.ID, "item ID"),
    eTag: requiredRevisionValue(item?.eTag, "eTag"),
    lastModifiedDateTime: requiredRevisionValue(
      item?.lastModifiedDateTime,
      "lastModifiedDateTime",
    ),
    reviewStatus: requiredRevisionValue(
      reviewStatusValue(item?.fields?.ReviewStatus),
      "review status",
    ),
    slug: requireSlug ? requireSafeSlug(slug, "SharePoint source") : slug,
  };
}

export function createSourceRevision(fields) {
  const revision = fields?.__sourceRevision;
  if (!revision) throw new Error("SharePoint source revision is missing");
  return {
    itemId: requiredRevisionValue(revision.itemId, "item ID"),
    eTag: requiredRevisionValue(revision.eTag, "eTag"),
    lastModifiedDateTime: requiredRevisionValue(
      revision.lastModifiedDateTime,
      "lastModifiedDateTime",
    ),
    reviewStatus: requiredRevisionValue(revision.reviewStatus, "review status"),
    slug: requireSafeSlug(revision.slug, "SharePoint source"),
  };
}

export function assertSourceRevision(expected, currentItem) {
  const current = sourceRevisionFromGraphItem(currentItem);
  for (const [key, label] of [
    ["itemId", "item ID"],
    ["eTag", "eTag"],
    ["lastModifiedDateTime", "modified time"],
    ["reviewStatus", "status"],
    ["slug", "slug"],
  ]) {
    if (current[key] !== expected[key]) {
      throw new Error(`SharePoint source ${label} changed; refusing repository mutation`);
    }
  }
  return current;
}

export async function fetchSharePointItem({
  token,
  siteId,
  listId,
  itemId,
  fetchImpl = fetch,
}) {
  const url = new URL(
    `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}`,
  );
  url.searchParams.set("$expand", "fields");
  const response = await fetchImpl(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    redirect: "error",
  });
  if (!response.ok) {
    throw new Error(`Microsoft Graph item read failed with HTTP ${response.status}`);
  }
  const item = await response.json();
  sourceRevisionFromGraphItem(item);
  return item;
}

export async function selectApprovedSubmission(fieldsList, { catalogDirectory, requestedSlug } = {}) {
  const approved = fieldsList
    .filter(isApprovedSubmission)
    .sort((left, right) => Number(left.ID ?? 0) - Number(right.ID ?? 0));

  if (requestedSlug) {
    requireSafeSlug(requestedSlug, "requested submission");
    const selected = approved.find((fields) => String(fields.Slug ?? "").trim() === requestedSlug);
    if (!selected) throw new Error(`approved submission not found for slug ${requestedSlug}`);
    if (await pathExists(path.join(catalogDirectory, `${requestedSlug}.json`))) return null;
    return selected;
  }

  for (const fields of approved) {
    const slug = String(fields.Slug ?? "").trim();
    if (!slug) return fields;
    if (!(await pathExists(path.join(catalogDirectory, `${slug}.json`)))) return fields;
  }
  return null;
}

export async function selectWithdrawnSubmission(fieldsList, { catalogDirectory, requestedSlug } = {}) {
  const withdrawn = fieldsList
    .filter(isWithdrawnSubmission)
    .sort((left, right) => Number(left.ID ?? 0) - Number(right.ID ?? 0));

  if (requestedSlug) {
    requireSafeSlug(requestedSlug, "requested withdrawal");
    const selected = withdrawn.find((fields) => String(fields.Slug ?? "").trim() === requestedSlug);
    if (!selected) return null;
    return (await pathExists(path.join(catalogDirectory, `${requestedSlug}.json`))) ? selected : null;
  }

  for (const fields of withdrawn) {
    const slug = requireSafeSlug(fields.Slug, "withdrawn submission");
    if (await pathExists(path.join(catalogDirectory, `${slug}.json`))) return fields;
  }
  return null;
}

async function writeNewFile(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, { flag: "wx" });
}

export async function prepareApprovedSubmission({
  fields,
  repositoryRoot,
  downloadImage = downloadPublicImage,
}) {
  const catalogDirectory = path.join(repositoryRoot, "catalog", "solutions");
  const imageDirectory = path.join(repositoryRoot, "public", "images", "solutions");
  const baseSolution = buildPublicSolution(fields, { thumbnail: null });
  const catalogPath = path.join(catalogDirectory, `${baseSolution.slug}.json`);
  const imagePath = path.join(imageDirectory, `${baseSolution.slug}.webp`);

  if (await pathExists(catalogPath)) throw new Error(`catalog slug already exists: ${baseSolution.slug}`);
  if (await pathExists(imagePath)) throw new Error(`thumbnail already exists without a catalog item: ${baseSolution.slug}`);

  const candidateUrl = getThumbnailCandidateUrl(fields);
  let solution = baseSolution;
  let thumbnailStatus = candidateUrl ? "fallback" : "not-provided";
  let processedImagePath = null;
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "plug-solutions-approved-"));

  try {
    if (candidateUrl) {
      try {
        const downloaded = await downloadImage(candidateUrl);
        const rawPath = path.join(temporaryDirectory, "candidate-image");
        await writeFile(rawPath, downloaded.bytes, { flag: "wx" });
        const processed = await processThumbnail({
          inputPath: rawPath,
          slug: baseSolution.slug,
          outputRoot: temporaryDirectory,
        });
        solution = buildPublicSolution(fields, { thumbnail: processed.publicPath });
        processedImagePath = processed.outputPath;
        thumbnailStatus = "processed";
      } catch (error) {
        if (error instanceof UnsafeImageUrlError) throw error;
        solution = baseSolution;
        thumbnailStatus = "fallback";
      }
    }

    assertNoPrivateFields(solution);
    let imageWritten = false;
    try {
      if (processedImagePath) {
        await mkdir(imageDirectory, { recursive: true });
        await copyFile(processedImagePath, imagePath, 1);
        imageWritten = true;
      }
      await writeNewFile(catalogPath, `${JSON.stringify(solution, null, 2)}\n`);
    } catch (error) {
      if (imageWritten) await rm(imagePath, { force: true });
      throw error;
    }

    return {
      status: "prepared",
      slug: solution.slug,
      catalogPath,
      imagePath: processedImagePath ? imagePath : null,
      thumbnailStatus,
    };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

export async function prepareWithdrawnSubmission({ fields, repositoryRoot }) {
  if (!isWithdrawnSubmission(fields)) throw new Error("submission is not withdrawn");
  const slug = requireSafeSlug(fields?.Slug, "withdrawn submission");

  const catalogPath = path.join(repositoryRoot, "catalog", "solutions", `${slug}.json`);
  const imagePath = path.join(repositoryRoot, "public", "images", "solutions", `${slug}.webp`);
  const solution = JSON.parse(await readFile(catalogPath, "utf8"));
  validateSolution(solution, `catalog item ${slug}`);
  if (solution.slug !== slug) throw new Error(`catalog filename and slug do not match: ${slug}`);

  const expectedThumbnail = `/images/solutions/${slug}.webp`;
  const imageExists = await pathExists(imagePath);
  if (solution.thumbnail !== null && solution.thumbnail !== expectedThumbnail) {
    throw new Error(`catalog thumbnail does not match withdrawn slug: ${slug}`);
  }
  if ((solution.thumbnail === expectedThumbnail) !== imageExists) {
    throw new Error(`catalog thumbnail file state is inconsistent: ${slug}`);
  }

  await rm(catalogPath);
  if (imageExists) await rm(imagePath);
  return {
    status: "prepared",
    operation: "remove",
    slug,
    catalogPath,
    imagePath: imageExists ? imagePath : null,
    thumbnailStatus: imageExists ? "removed" : "not-present",
  };
}

export async function readFixtureItems(filePath) {
  const value = JSON.parse(await readFile(filePath, "utf8"));
  return normalizeGraphItems(Array.isArray(value) ? value : value.value);
}
