import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLoungeEmbedUrl,
  getLoungeConfig,
  isLoungeOpen,
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
