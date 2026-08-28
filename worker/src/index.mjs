const REACTION_TYPES = Object.freeze(["interested", "tried", "adopted"]);
const DAILY_REACTION_CAP = 5000;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TOKEN_MIN_LENGTH = 16;
const TOKEN_MAX_LENGTH = 256;

function jsonResponse(value, status, corsHeaders) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders,
    },
  });
}

function responseHeaders(origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

function requestOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || !env.ALLOWED_ORIGIN || origin !== env.ALLOWED_ORIGIN) return null;
  return origin;
}

function validSlug(slug) {
  return typeof slug === "string" && slug.length <= 100 && SLUG_PATTERN.test(slug);
}

function utcDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function parseReactionPath(request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 3 || parts[0] !== "v1" || parts[1] !== "reactions") return null;
  let slug;
  try {
    slug = decodeURIComponent(parts[2]);
  } catch {
    return null;
  }
  return validSlug(slug) ? slug : null;
}

export async function hashVisitorToken(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateToken(value) {
  const hasControlCharacter = [...String(value ?? "")].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  return typeof value === "string"
    && value.length >= TOKEN_MIN_LENGTH
    && value.length <= TOKEN_MAX_LENGTH
    && !hasControlCharacter;
}

async function reactionCounts(db, slug) {
  const result = await db.prepare(
    "SELECT reaction_type, count FROM reaction_totals WHERE slug = ? ORDER BY reaction_type",
  ).bind(slug).all();
  const counts = { interested: 0, tried: 0, adopted: 0 };
  for (const row of result.results ?? []) {
    if (REACTION_TYPES.includes(row.reaction_type)) counts[row.reaction_type] = Number(row.count) || 0;
  }
  return counts;
}

async function hasActiveSlug(db, slug) {
  const row = await db.prepare(
    "SELECT slug FROM solution_slugs WHERE slug = ? AND active = 1",
  ).bind(slug).first();
  return Boolean(row);
}

export async function recordReaction(db, { slug, reactionType, visitorToken, now = new Date() }) {
  if (!validSlug(slug)) return { status: 400, error: "invalid_slug" };
  if (!REACTION_TYPES.includes(reactionType)) return { status: 400, error: "invalid_reaction" };
  if (!validateToken(visitorToken)) return { status: 400, error: "invalid_visitor_token" };
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return { status: 400, error: "invalid_request" };
  if (!(await hasActiveSlug(db, slug))) return { status: 404, error: "unknown_slug" };

  const visitorHash = await hashVisitorToken(visitorToken);
  const usageDate = utcDay(now);
  const eventId = crypto.randomUUID();
  const eventExists = "EXISTS (SELECT 1 FROM reaction_events WHERE event_id = ? AND slug = ? AND reaction_type = ?)";
  const statements = [
    db.prepare(
      "INSERT OR IGNORE INTO daily_usage (usage_date, event_count) VALUES (?, 0)",
    ).bind(usageDate),
    db.prepare(
      `INSERT OR IGNORE INTO reaction_events (event_id, slug, reaction_type, visitor_hash, usage_date)
       SELECT ?, ?, ?, ?, ?
       WHERE (SELECT event_count FROM daily_usage WHERE usage_date = ?) < ?
         AND NOT EXISTS (SELECT 1 FROM reaction_events WHERE slug = ? AND reaction_type = ? AND visitor_hash = ?)`,
    ).bind(eventId, slug, reactionType, visitorHash, usageDate, usageDate, DAILY_REACTION_CAP, slug, reactionType, visitorHash),
    db.prepare(
      `UPDATE daily_usage SET event_count = event_count + 1
       WHERE usage_date = ? AND ${eventExists}`,
    ).bind(usageDate, eventId, slug, reactionType),
    db.prepare(
      `INSERT INTO reaction_totals (slug, reaction_type, count)
       SELECT ?, ?, 1 WHERE ${eventExists}
       ON CONFLICT(slug, reaction_type) DO UPDATE SET count = reaction_totals.count + 1`,
    ).bind(slug, reactionType, eventId, slug, reactionType),
  ];

  try {
    await db.batch(statements);
  } catch {
    return { status: 503, error: "storage_unavailable" };
  }

  const counts = await reactionCounts(db, slug);
  const event = await db.prepare(
    "SELECT event_id FROM reaction_events WHERE event_id = ?",
  ).bind(eventId).first();
  if (event) return { status: 201, accepted: true, slug, counts };

  const duplicate = await db.prepare(
    "SELECT event_id FROM reaction_events WHERE slug = ? AND reaction_type = ? AND visitor_hash = ?",
  ).bind(slug, reactionType, visitorHash).first();
  if (duplicate) return { status: 200, accepted: false, slug, counts };

  const usage = await db.prepare(
    "SELECT event_count FROM daily_usage WHERE usage_date = ?",
  ).bind(usageDate).first();
  if (Number(usage?.event_count) >= DAILY_REACTION_CAP) return { status: 429, error: "daily_limit" };
  return { status: 503, error: "storage_unavailable" };
}

export async function syncManifest(db, manifest) {
  const slugs = Array.isArray(manifest) ? manifest : manifest?.slugs;
  if (!Array.isArray(slugs)) throw new Error("manifest must contain slugs");
  const uniqueSlugs = [...new Set(slugs)];
  if (uniqueSlugs.length === 0) throw new Error("manifest must not be empty");
  if (uniqueSlugs.some((slug) => !validSlug(slug))) throw new Error("manifest contains an invalid slug");
  const statements = [db.prepare("UPDATE solution_slugs SET active = 0")];
  for (const slug of uniqueSlugs) {
    statements.push(db.prepare(
      "INSERT INTO solution_slugs (slug, active) VALUES (?, 1) ON CONFLICT(slug) DO UPDATE SET active = 1",
    ).bind(slug));
  }
  await db.batch(statements);
  return uniqueSlugs;
}

async function getReactions(db, slug) {
  if (!(await hasActiveSlug(db, slug))) return { status: 404, error: "unknown_slug" };
  return { status: 200, slug, counts: await reactionCounts(db, slug) };
}

async function handleRequest(request, env) {
  const origin = requestOrigin(request, env);
  if (!origin) return new Response("Forbidden", { status: 403 });
  const headers = responseHeaders(origin);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (!env.DB) return jsonResponse({ error: "service_unavailable" }, 503, headers);

  const slug = parseReactionPath(request);
  if (!slug) return jsonResponse({ error: "not_found" }, 404, headers);
  try {
    if (request.method === "GET") {
      const result = await getReactions(env.DB, slug);
      const { status, ...body } = result;
      return jsonResponse(body, status, headers);
    }
    if (request.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405, headers);
    const contentLength = Number(request.headers.get("Content-Length") ?? 0);
    if (contentLength > 4096) return jsonResponse({ error: "request_too_large" }, 413, headers);
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400, headers);
    }
    const result = await recordReaction(env.DB, {
      slug,
      reactionType: body?.reactionType,
      visitorToken: body?.visitorToken,
    });
    const { status, ...payload } = result;
    return jsonResponse(payload, status, headers);
  } catch {
    return jsonResponse({ error: "service_unavailable" }, 503, headers);
  }
}

async function refreshManifest(env) {
  if (!env.CATALOG_MANIFEST_URL || !env.DB) return;
  const response = await fetch(env.CATALOG_MANIFEST_URL, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("manifest fetch failed");
  await syncManifest(env.DB, await response.json());
}

export { handleRequest, REACTION_TYPES, DAILY_REACTION_CAP };

export default {
  fetch: handleRequest,
  scheduled(_event, env, context) {
    context.waitUntil(refreshManifest(env));
  },
};
