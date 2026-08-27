import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLoungeEmbedUrl,
  getLoungeConfig,
  getLoungeTimerDelay,
  getLoungeViewState,
  isLoungeOpen,
  MAX_PILOT_WINDOW_MS,
} from "../lib/lounge-config.mjs";

const validPilotEnvironment = {
  NEXT_PUBLIC_LOUNGE_MODE: "pilot",
  NEXT_PUBLIC_LOUNGE_ROOM: "plug-event-2026-08",
  NEXT_PUBLIC_LOUNGE_START_AT: "2026-08-27T10:00:00+09:00",
  NEXT_PUBLIC_LOUNGE_END_AT: "2026-08-27T12:00:00+09:00",
};

test("lounge stays closed unless a complete pilot configuration is provided", () => {
  assert.deepEqual(getLoungeConfig({}), {
    mode: "closed",
    reason: "mode_closed",
  });

  assert.deepEqual(
    getLoungeConfig({ ...validPilotEnvironment, NEXT_PUBLIC_LOUNGE_ROOM: "short" }),
    { mode: "closed", reason: "invalid_room" },
  );

  assert.deepEqual(
    getLoungeConfig({ ...validPilotEnvironment, NEXT_PUBLIC_LOUNGE_END_AT: "invalid" }),
    { mode: "closed", reason: "invalid_schedule" },
  );

  for (const invalidStart of [
    "2026-08-27",
    "2026-08-27T10:00:00",
    "2026-02-30T10:00:00+09:00",
    "2026-08-27T10:00:00+15:00",
  ]) {
    assert.deepEqual(
      getLoungeConfig({ ...validPilotEnvironment, NEXT_PUBLIC_LOUNGE_START_AT: invalidStart }),
      { mode: "closed", reason: "invalid_schedule" },
    );
  }
});

test("pilot room is open only inside its declared event window", () => {
  const config = getLoungeConfig(validPilotEnvironment);
  assert.equal(config.mode, "pilot");
  assert.equal(isLoungeOpen(config, Date.parse("2026-08-27T09:59:59+09:00")), false);
  assert.equal(isLoungeOpen(config, Date.parse("2026-08-27T10:00:00+09:00")), true);
  assert.equal(isLoungeOpen(config, Date.parse("2026-08-27T11:59:59+09:00")), true);
  assert.equal(isLoungeOpen(config, Date.parse("2026-08-27T12:00:00+09:00")), false);
});

test("pilot window stays below the browser timer safety limit", () => {
  const start = Date.parse(validPilotEnvironment.NEXT_PUBLIC_LOUNGE_START_AT);
  const justBelow = new Date(start + MAX_PILOT_WINDOW_MS - 1).toISOString();
  const atLimit = new Date(start + MAX_PILOT_WINDOW_MS).toISOString();

  assert.equal(
    getLoungeConfig({ ...validPilotEnvironment, NEXT_PUBLIC_LOUNGE_END_AT: justBelow }).mode,
    "pilot",
  );
  assert.deepEqual(
    getLoungeConfig({ ...validPilotEnvironment, NEXT_PUBLIC_LOUNGE_END_AT: atLimit }),
    { mode: "closed", reason: "invalid_schedule" },
  );
});

test("lounge timer delay is capped without delaying an ended event", () => {
  const now = Date.parse("2026-08-27T10:00:00Z");
  assert.equal(getLoungeTimerDelay(now - 1, now), 0);
  assert.equal(getLoungeTimerDelay(now + 1_000, now), 1_000);
  assert.equal(getLoungeTimerDelay(now + MAX_PILOT_WINDOW_MS + 1, now), MAX_PILOT_WINDOW_MS);
});

test("long future event re-schedules after the cap until it ends", () => {
  const now = Date.parse("2026-08-27T10:00:00Z");
  const end = now + MAX_PILOT_WINDOW_MS + 60 * 60 * 1_000;
  assert.equal(getLoungeTimerDelay(end, now), MAX_PILOT_WINDOW_MS);
  assert.equal(getLoungeTimerDelay(end, now + MAX_PILOT_WINDOW_MS), 60 * 60 * 1_000);
  assert.equal(getLoungeTimerDelay(end, end), 0);
});

test("lounge view state never connects before schedule and consent", () => {
  const closed = getLoungeConfig({});
  const pilot = getLoungeConfig(validPilotEnvironment);
  const before = Date.parse("2026-08-27T09:59:59+09:00");
  const during = Date.parse("2026-08-27T10:30:00+09:00");
  const after = Date.parse("2026-08-27T12:00:00+09:00");

  assert.equal(getLoungeViewState(closed, during, true), "closed");
  assert.equal(getLoungeViewState(pilot, null, true), "scheduled");
  assert.equal(getLoungeViewState(pilot, before, true), "scheduled");
  assert.equal(getLoungeViewState(pilot, during, false), "consent");
  assert.equal(getLoungeViewState(pilot, during, true), "open");
  assert.equal(getLoungeViewState(pilot, after, true), "scheduled");
});

test("embed URL is fixed to chat.exe and disables room movement and media", () => {
  const config = getLoungeConfig(validPilotEnvironment);
  const embedUrl = new URL(buildLoungeEmbedUrl(config));

  assert.equal(embedUrl.origin, "https://app.chatexe.net");
  assert.equal(embedUrl.pathname, "/");
  assert.equal(embedUrl.searchParams.get("room"), "plug-event-2026-08");
  assert.equal(embedUrl.searchParams.get("private"), "1");
  assert.equal(embedUrl.searchParams.get("showFrame"), "1");
  assert.equal(embedUrl.searchParams.get("showMoveRoom"), "0");
  assert.equal(embedUrl.searchParams.get("enableCamera"), "0");
  assert.equal(embedUrl.searchParams.get("enableMic"), "0");
  assert.equal(embedUrl.searchParams.get("enableScreen"), "0");
});
