const EMBED_ORIGIN = "https://app.chatexe.net";
const ROOM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;

/**
 * @typedef {{ mode: "closed", reason: string } | { mode: "open", room: string }} LoungeConfig
 */

/** @param {Record<string, string | undefined>} environment @returns {LoungeConfig} */
export function getLoungeConfig(environment = process.env) {
  if (environment.NEXT_PUBLIC_LOUNGE_MODE !== "open") {
    return { mode: "closed", reason: "mode_closed" };
  }

  const room = environment.NEXT_PUBLIC_LOUNGE_ROOM?.trim() ?? "";
  if (!ROOM_PATTERN.test(room)) {
    return { mode: "closed", reason: "invalid_room" };
  }

  return { mode: "open", room };
}

/** @param {LoungeConfig} config */
export function buildLoungeEmbedUrl(config) {
  if (config.mode !== "open") {
    throw new Error("The lounge embed URL is available only when the lounge is open.");
  }

  const url = new URL("/", EMBED_ORIGIN);
  url.search = new URLSearchParams({
    room: config.room,
    private: "1",
    showFrame: "1",
    lang: "ja",
    showUsers: "1",
    showMoveRoom: "0",
    enableCamera: "0",
    enableMic: "0",
    enableScreen: "0",
  }).toString();
  return url.toString();
}
