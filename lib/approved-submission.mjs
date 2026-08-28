import { validateSolution } from "./catalog-schema.mjs";
import { normalizeRelatedUrls, normalizeTypesAndUses } from "./normalize-submission.mjs";

export { normalizeRelatedUrls, normalizeTypesAndUses };

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

function dateOnlyOrReviewedAt(fields) {
  const reviewedAt = String(fields?.ReviewedAt ?? "").trim();
  if (reviewedAt) return dateOnly({ ReviewedAt: reviewedAt }, "ReviewedAt");
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function normalizeXHandle(value) {
  const raw = String(value ?? "").trim();
  const handle = raw && !raw.startsWith("@") ? `@${raw}` : raw;
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
  const rawTypesAndUses = String(fields?.TypesAndUses ?? "").trim();
  if (!rawTypesAndUses) throw new Error("TypesAndUses is required");
  const q6 = normalizeTypesAndUses(rawTypesAndUses);
  if (q6.status === "要確認") throw new Error("TypesAndUses contains unknown choices");
  const rawRelatedUrls = String(fields?.RelatedUrls ?? "").trim();
  const q8 = normalizeRelatedUrls(rawRelatedUrls);
  if (q8.status === "要確認") throw new Error("RelatedUrls requires review");
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
    type: q6.type,
    categories: q6.categories,
    tags: q6.tags,
    distributionUrl: optionalHttpsUrl(fields, "DistributionUrl"),
    sourceUrl: q8.sourceUrl,
    instructionsUrl: q8.instructionsUrl,
    license: "配布先を確認",
    cost: "配布先を確認",
    premiumRequired: null,
    setupTime: "未記載",
    prerequisites: [],
    thumbnail,
    publishedAt: dateOnlyOrReviewedAt(fields),
    updatedAt: dateOnlyOrReviewedAt(fields),
  };

  if (solution.categories.length === 0) {
    throw new Error("Q6 must contain at least one category");
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
  const value = String(fields?.ThumbnailCandidateUrl ?? "").trim();
  return value ? normalizeThumbnailCandidateUrl(value) : null;
}

/** Convert only canonical GitHub blob links to immutable raw content URLs. */
export function normalizeThumbnailCandidateUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return value;
  }
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") return value;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 5 || parts[2] !== "blob") return value;
  const [owner, repo, , ref, ...file] = parts;
  const hasControlCharacter = (text) => [...text].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(owner)
    || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repo)
    || !ref || /\.\.|\s/.test(ref) || hasControlCharacter(ref)
    || file.length === 0 || file.some((segment) => segment === ".." || /%2e/i.test(segment) || hasControlCharacter(segment))) return value;
 return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${file.join("/")}`;
}
