const allowedFields = new Set([
  "schemaVersion",
  "slug",
  "title",
  "maker",
  "description",
  "type",
  "categories",
  "tags",
  "distributionUrl",
  "sourceUrl",
  "instructionsUrl",
  "license",
  "cost",
  "premiumRequired",
  "setupTime",
  "prerequisites",
  "thumbnail",
  "publishedAt",
  "updatedAt",
]);

export const forbiddenPublicFields = [
  "responseId",
  "responseID",
  "email",
  "mail",
  "name",
  "consent",
  "reviewNotes",
  "reviewNote",
  "thumbnailCandidateUrl",
  "submittedAt",
];

function fail(source, message) {
  throw new Error(`${source}: ${message}`);
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(value, field, source) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(source, `${field} must be a non-empty string`);
  }
}

function requireHttpsOrNull(value, field, source) {
  if (value === null) return;
  requireString(value, field, source);
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(source, `${field} must be a valid URL`);
  }
  if (url.protocol !== "https:") fail(source, `${field} must use HTTPS`);
}

function requireStringArray(value, field, source, allowEmpty = false) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(source, `${field} must be ${allowEmpty ? "an" : "a non-empty"} array`);
  }
  value.forEach((item, index) => requireString(item, `${field}[${index}]`, source));
}

function requireDate(value, field, source) {
  requireString(value, field, source);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(source, `${field} must be YYYY-MM-DD`);
  }
}

export function validateSolution(value, source = "solution") {
  if (!isObject(value)) fail(source, "must be an object");

  for (const key of Object.keys(value)) {
    if (!allowedFields.has(key)) fail(source, `unknown or private field: ${key}`);
  }
  for (const field of forbiddenPublicFields) {
    if (field in value) fail(source, `forbidden public field: ${field}`);
  }

  if (value.schemaVersion !== 1) fail(source, "schemaVersion must be 1");
  requireString(value.slug, "slug", source);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) fail(source, "slug format is invalid");
  requireString(value.title, "title", source);
  requireString(value.description, "description", source);
  requireString(value.type, "type", source);
  requireStringArray(value.categories, "categories", source);
  requireStringArray(value.tags, "tags", source, true);

  if (!isObject(value.maker)) fail(source, "maker must be an object");
  const makerKeys = Object.keys(value.maker);
  if (makerKeys.some((key) => !["displayName", "xHandle", "xUrl"].includes(key))) {
    fail(source, "maker contains an unknown field");
  }
  requireString(value.maker.displayName, "maker.displayName", source);
  requireString(value.maker.xHandle, "maker.xHandle", source);
  if (!/^@[A-Za-z0-9_]{1,15}$/.test(value.maker.xHandle)) fail(source, "maker.xHandle format is invalid");
  requireHttpsOrNull(value.maker.xUrl, "maker.xUrl", source);
  if (!new URL(value.maker.xUrl).hostname.endsWith("x.com")) fail(source, "maker.xUrl must use x.com");

  requireHttpsOrNull(value.distributionUrl, "distributionUrl", source);
  requireHttpsOrNull(value.sourceUrl, "sourceUrl", source);
  requireHttpsOrNull(value.instructionsUrl, "instructionsUrl", source);
  requireString(value.license, "license", source);
  requireString(value.cost, "cost", source);
  if (![true, false, null].includes(value.premiumRequired)) fail(source, "premiumRequired must be boolean or null");
  requireString(value.setupTime, "setupTime", source);
  requireStringArray(value.prerequisites, "prerequisites", source, true);
  if (value.thumbnail !== null) {
    requireString(value.thumbnail, "thumbnail", source);
    if (!/^\/images\/solutions\/[a-z0-9-]+\.webp$/.test(value.thumbnail)) {
      fail(source, "thumbnail must be a local /images/solutions/*.webp path");
    }
  }
  requireDate(value.publishedAt, "publishedAt", source);
  requireDate(value.updatedAt, "updatedAt", source);
  if (value.updatedAt < value.publishedAt) fail(source, "updatedAt cannot precede publishedAt");

  return value;
}

export function validateReactionCounts(value, knownSlugs, source = "reactions") {
  if (!isObject(value)) fail(source, "must be an object");
  for (const [slug, counts] of Object.entries(value)) {
    if (!knownSlugs.has(slug)) fail(source, `unknown solution slug: ${slug}`);
    if (!isObject(counts)) fail(source, `${slug} must be an object`);
    const keys = Object.keys(counts);
    if (keys.length !== 3 || keys.some((key) => !["interested", "tried", "adopted"].includes(key))) {
      fail(source, `${slug} contains invalid reaction fields`);
    }
    for (const key of ["interested", "tried", "adopted"]) {
      if (!Number.isInteger(counts[key]) || counts[key] < 0) fail(source, `${slug}.${key} must be a non-negative integer`);
    }
  }
  return value;
}
