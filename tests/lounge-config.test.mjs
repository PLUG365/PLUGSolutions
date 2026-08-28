import assert from "node:assert/strict";
import test from "node:test";

import { buildLoungeEmbedUrl, getLoungeConfig } from "../lib/lounge-config.mjs";

const validOpenEnvironment = {
  NEXT_PUBLIC_LOUNGE_MODE: "open",
  NEXT_PUBLIC_LOUNGE_ROOM: "plug-local-pilot",
};

test("lounge stays closed until the explicit open switch and a valid room are present", () => {
  assert.deepEqual(getLoungeConfig({}), {
    mode: "closed",
    reason: "mode_closed",
  });

  assert.deepEqual(
    getLoungeConfig({ ...validOpenEnvironment, NEXT_PUBLIC_LOUNGE_MODE: "closed" }),
    { mode: "closed", reason: "mode_closed" },
  );

  assert.deepEqual(
    getLoungeConfig({ ...validOpenEnvironment, NEXT_PUBLIC_LOUNGE_ROOM: "short" }),
    { mode: "closed", reason: "invalid_room" },
  );

  assert.deepEqual(
    getLoungeConfig({ ...validOpenEnvironment, NEXT_PUBLIC_LOUNGE_ROOM: "room with spaces" }),
    { mode: "closed", reason: "invalid_room" },
  );
});

test("a valid room is always available while the explicit switch is open", () => {
  assert.deepEqual(getLoungeConfig(validOpenEnvironment), {
    mode: "open",
    room: "plug-local-pilot",
  });
});

test("embed URL is fixed to chat.exe and keeps media and room movement disabled", () => {
  const config = getLoungeConfig(validOpenEnvironment);
  const embedUrl = new URL(buildLoungeEmbedUrl(config));

  assert.equal(embedUrl.origin, "https://app.chatexe.net");
  assert.equal(embedUrl.pathname, "/");
  assert.equal(embedUrl.searchParams.get("room"), "plug-local-pilot");
  assert.equal(embedUrl.searchParams.get("private"), "1");
  assert.equal(embedUrl.searchParams.get("showFrame"), "1");
  assert.equal(embedUrl.searchParams.get("showUsers"), "1");
  assert.equal(embedUrl.searchParams.get("showMoveRoom"), "0");
  assert.equal(embedUrl.searchParams.get("enableCamera"), "0");
  assert.equal(embedUrl.searchParams.get("enableMic"), "0");
  assert.equal(embedUrl.searchParams.get("enableScreen"), "0");
});

test("closed config cannot produce an embed URL", () => {
  assert.throws(
    () => buildLoungeEmbedUrl(getLoungeConfig({})),
    /only when the lounge is open/,
  );
});
