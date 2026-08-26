const EMBED_ORIGIN = "https://app.chatexe.net";
const ROOM_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{7,63}$/;
const RFC3339_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/;

/**
 * @typedef {{ mode: "closed", reason: string } | {
 *   mode: "pilot",
 *   room: string,
 *   startAt: string,
 *   endAt: string,
 *   startTime: number,
 *   endTime: number,
 * }} LoungeConfig
 */

/** @param {Record<string, string | undefined>} environment @returns {LoungeConfig} */
export function getLoungeConfig(environment = process.env) {
  if (environment.NEXT_PUBLIC_LOUNGE_MODE !== "pilot") {
    return { mode: "closed", reason: "mode_closed" };
  }

  const room = environment.NEXT_PUBLIC_LOUNGE_ROOM?.trim() ?? "";
  if (!ROOM_PATTERN.test(room)) {
    return { mode: "closed", reason: "invalid_room" };
  }

  const startAt = environment.NEXT_PUBLIC_LOUNGE_START_AT?.trim() ?? "";
  const endAt = environment.NEXT_PUBLIC_LOUNGE_END_AT?.trim() ?? "";
  if (!isStrictRfc3339(startAt) || !isStrictRfc3339(endAt)) {
    return { mode: "closed", reason: "invalid_schedule" };
  }

  const startTime = Date.parse(startAt);
  const endTime = Date.parse(endAt);

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return { mode: "closed", reason: "invalid_schedule" };
  }

  return {
    mode: "pilot",
    room,
    startAt,
    endAt,
    startTime,
    endTime,
  };
}

function isStrictRfc3339(value) {
  const match = RFC3339_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[9] === undefined ? 0 : Number(match[9]);
  const offsetMinute = match[10] === undefined ? 0 : Number(match[10]);
  const daysInMonth = month >= 1 && month <= 12
    ? new Date(Date.UTC(year, month, 0)).getUTCDate()
    : 0;

  return day >= 1
    && day <= daysInMonth
    && hour <= 23
    && minute <= 59
    && second <= 59
    && offsetHour <= 14
    && offsetMinute <= 59
    && (offsetHour < 14 || offsetMinute === 0);
}

/** @param {LoungeConfig} config @param {number} now */
export function isLoungeOpen(config, now = Date.now()) {
  return config.mode === "pilot" && now >= config.startTime && now < config.endTime;
}

/** @param {LoungeConfig} config */
export function buildLoungeEmbedUrl(config) {
  if (config.mode !== "pilot") {
    throw new Error("The lounge embed URL is available only in pilot mode.");
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
