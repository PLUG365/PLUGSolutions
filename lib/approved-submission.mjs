import { validateSolution } from "./catalog-schema.mjs";

const APPROVED_STATUS = "承認";
const WITHDRAWN_STATUS = "取り下げ";
const PRIVATE_FIELD_NAMES = new Set([
  "ResponseId",
  "ConsentAnswer",
  "ReviewNotes",
  "ThumbnailCandidateUrl",
  "SubmittedAt",
  "ReviewedAt",
]);

function requiredText(fields, name) {
  const value = String(fields?.[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function optionalHttpsUrl(fields, name) {
  const value = String(fields?.[name] ?? "").trim();
  if (!value) return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
  if (url.protocol !== "https:") throw new Error(`${name} must use HTTPS`);
  return url.href;
}

function lines(value) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function dateOnly(fields, name) {
  const value = requiredText(fields, name);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new Error(`${name} must be YYYY-MM-DD or an ISO timestamp`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${name} must be a valid date`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value: part }) => [type, part]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function premiumRequired(value) {
  switch (String(value ?? "").trim()) {
    case "必要":
      return true;
    case "不要":
      return false;
    case "不明":
      return null;
    default:
      throw new Error("PremiumRequired must be 必要, 不要, or 不明");
  }
}

function normalizeXHandle(value) {
  const handle = String(value ?? "").trim();
  if (!/^@[A-Za-z0-9_]{1,15}$/.test(handle)) {
    throw new Error("XHandle must start with @ and contain a valid X handle");
  }
  return handle;
}

export function isApprovedSubmission(fields) {
  return String(fields?.ReviewStatus ?? "").trim() === APPROVED_STATUS;
}

export function isWithdrawnSubmission(fields) {
  return String(fields?.ReviewStatus ?? "").trim() === WITHDRAWN_STATUS;
}

export function buildPublicSolution(fields, { thumbnail = null } = {}) {
  if (!isApprovedSubmission(fields)) throw new Error("submission is not approved");

  const xHandle = normalizeXHandle(fields.XHandle);
  const solution = {
    schemaVersion: 1,
    slug: requiredText(fields, "Slug"),
    title: requiredText(fields, "Title"),
    maker: {
      displayName: requiredText(fields, "MakerDisplayName"),
      xHandle,
      xUrl: `https://x.com/${xHandle.slice(1)}`,
    },
    description: requiredText(fields, "Description"),
    type: requiredText(fields, "CatalogType"),
    categories: lines(fields.CatalogCategories),
    tags: lines(fields.CatalogTags),
    distributionUrl: optionalHttpsUrl(fields, "DistributionUrl"),
    sourceUrl: optionalHttpsUrl(fields, "SourceUrl"),
    instructionsUrl: optionalHttpsUrl(fields, "InstructionsUrl"),
    license: requiredText(fields, "CatalogLicense"),
    cost: requiredText(fields, "CatalogCost"),
    premiumRequired: premiumRequired(fields.PremiumRequired),
    setupTime: requiredText(fields, "SetupTime"),
    prerequisites: lines(fields.CatalogPrerequisites),
    thumbnail,
    publishedAt: dateOnly(fields, "CatalogPublishedDate"),
    updatedAt: dateOnly(fields, "CatalogUpdatedDate"),
  };

  if (solution.categories.length === 0) {
    throw new Error("CatalogCategories must contain at least one value");
  }
  validateSolution(solution, `SharePoint item ${fields?.ID ?? "unknown"}`);
  return solution;
}

export function assertNoPrivateFields(value) {
  const serialized = JSON.stringify(value);
  for (const name of PRIVATE_FIELD_NAMES) {
    if (serialized.includes(`"${name}"`)) {
      throw new Error(`public output contains private field ${name}`);
    }
  }
}

export function getThumbnailCandidateUrl(fields) {
  return String(fields?.ThumbnailCandidateUrl ?? "").trim() || null;
}
