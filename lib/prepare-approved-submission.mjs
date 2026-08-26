import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  assertNoPrivateFields,
  buildPublicSolution,
  getThumbnailCandidateUrl,
  isApprovedSubmission,
} from "./approved-submission.mjs";
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

export function normalizeGraphItems(items) {
  if (!Array.isArray(items)) throw new Error("SharePoint response must contain an item array");
  return items.map((item) => ({
    ...item.fields,
    ID: item.fields?.ID ?? item.id,
  }));
}

export async function selectApprovedSubmission(fieldsList, { catalogDirectory, requestedSlug } = {}) {
  const approved = fieldsList
    .filter(isApprovedSubmission)
    .sort((left, right) => Number(left.ID ?? 0) - Number(right.ID ?? 0));

  if (requestedSlug) {
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

export async function readFixtureItems(filePath) {
  const value = JSON.parse(await readFile(filePath, "utf8"));
  return normalizeGraphItems(Array.isArray(value) ? value : value.value);
}
