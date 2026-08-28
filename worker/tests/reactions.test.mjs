import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import {
  DAILY_REACTION_CAP,
  REACTION_TYPES,
  handleRequest,
  hashVisitorToken,
  recordReaction,
  syncManifest,
} from "../src/index.mjs";

class D1Statement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.parameters = [];
  }

  bind(...parameters) {
    this.parameters = parameters;
    return this;
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.parameters) ?? null;
  }

  async all() {
    return { results: this.database.prepare(this.sql).all(...this.parameters) };
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.parameters);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class LocalD1 {
  constructor() {
    this.database = new DatabaseSync(":memory:");
  }

  exec(sql) {
    this.database.exec(sql);
  }

  prepare(sql) {
    return new D1Statement(this.database, sql);
  }

  async batch(statements) {
    this.database.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

const migration = await readFile(new URL("../migrations/0001_reactions.sql", import.meta.url), "utf8");

function createDatabase() {
  const db = new LocalD1();
  db.exec(migration);
  db.database.prepare("INSERT INTO solution_slugs (slug) VALUES (?)").run("demo-tool");
  return db;
}

function request(method, slug, body, origin = "https://catalog.example") {
  return new Request(`https://reactions.example/v1/reactions/${slug}`, {
    method,
    headers: {
      Origin: origin,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

test("migration contains the four guarded D1 tables and enum constraint", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS solution_slugs/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS reaction_totals/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS reaction_events/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS daily_usage/);
  assert.match(migration, /UNIQUE \(slug, reaction_type, visitor_hash\)/);
  for (const type of REACTION_TYPES) assert.match(migration, new RegExp(`'${type}'`));
});

test("GET is fixed-origin, slug-scoped, and returns only aggregate counts", async () => {
  const db = createDatabase();
  const env = { DB: db, ALLOWED_ORIGIN: "https://catalog.example" };
  const response = await handleRequest(request("GET", "demo-tool"), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), env.ALLOWED_ORIGIN);
  assert.deepEqual(await response.json(), {
    slug: "demo-tool",
    counts: { interested: 0, tried: 0, adopted: 0 },
  });
  assert.equal((await handleRequest(request("GET", "missing-tool"), env)).status, 404);
  assert.equal((await handleRequest(request("GET", "demo-tool", null, "https://evil.example"), env)).status, 403);
});

test("POST hashes the visitor token, counts once, and is idempotent", async () => {
  const db = createDatabase();
  const env = { DB: db, ALLOWED_ORIGIN: "https://catalog.example" };
  const body = { reactionType: "interested", visitorToken: "visitor-token-123456" };
  const first = await handleRequest(request("POST", "demo-tool", body), env);
  assert.equal(first.status, 201);
  assert.deepEqual((await first.json()).counts, { interested: 1, tried: 0, adopted: 0 });
  const duplicate = await handleRequest(request("POST", "demo-tool", body), env);
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).accepted, false);
  const second = await handleRequest(request("POST", "demo-tool", { ...body, reactionType: "tried" }), env);
  assert.equal(second.status, 201);
  const rows = db.database.prepare("SELECT visitor_hash FROM reaction_events").all();
  assert.equal(rows.length, 2);
  assert.ok(rows.every(({ visitor_hash }) => visitor_hash !== body.visitorToken && /^[0-9a-f]{64}$/.test(visitor_hash)));
  assert.equal(await hashVisitorToken(body.visitorToken), rows[0].visitor_hash);
});

test("enum, token, method, and slug validation fail closed", async () => {
  const db = createDatabase();
  const env = { DB: db, ALLOWED_ORIGIN: "https://catalog.example" };
  assert.equal((await handleRequest(request("POST", "demo-tool", { reactionType: "other", visitorToken: "visitor-token-123456" }), env)).status, 400);
  assert.equal((await handleRequest(request("POST", "demo-tool", { reactionType: "tried", visitorToken: "short" }), env)).status, 400);
  assert.equal((await handleRequest(request("PUT", "demo-tool", null), env)).status, 405);
  assert.equal((await handleRequest(request("POST", "../demo-tool", { reactionType: "tried", visitorToken: "visitor-token-123456" }), env)).status, 404);
});

test("daily hard cap is enforced inside the write batch", async () => {
  const db = createDatabase();
  const env = { DB: db, ALLOWED_ORIGIN: "https://catalog.example" };
  const day = new Date().toISOString().slice(0, 10);
  db.database.prepare("INSERT INTO daily_usage (usage_date, event_count) VALUES (?, ?)").run(day, DAILY_REACTION_CAP - 1);
  const accepted = await recordReaction(db, {
    slug: "demo-tool",
    reactionType: "adopted",
    visitorToken: "visitor-token-cap-1",
    now: new Date(),
  });
  assert.equal(accepted.status, 201);
  const capped = await handleRequest(request("POST", "demo-tool", { reactionType: "adopted", visitorToken: "visitor-token-cap-2" }), env);
  assert.equal(capped.status, 429);
  assert.equal(db.database.prepare("SELECT event_count FROM daily_usage WHERE usage_date = ?").get(day).event_count, DAILY_REACTION_CAP);
});

test("manifest synchronization activates only known catalog slugs", async () => {
  const db = createDatabase();
  await syncManifest(db, { version: 1, slugs: ["new-tool"] });
  assert.equal((await handleRequest(request("GET", "demo-tool"), { DB: db, ALLOWED_ORIGIN: "https://catalog.example" })).status, 404);
  assert.equal((await handleRequest(request("GET", "new-tool"), { DB: db, ALLOWED_ORIGIN: "https://catalog.example" })).status, 200);
  await assert.rejects(syncManifest(db, { slugs: ["../unsafe"] }), /invalid slug/);
});
