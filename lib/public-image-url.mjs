import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";

const BLOCKED_HOST_SUFFIXES = [".local", ".internal", ".localhost", ".home", ".lan"];
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class UnsafeImageUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnsafeImageUrlError";
  }
}

function ipv4Number(address) {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const value = Number(part);
    if (value > 255) return null;
    result = result * 256 + value;
  }
  return result >>> 0;
}

function inIpv4Range(value, base, prefix) {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) === (ipv4Number(base) & mask);
}

function expandIpv6(address) {
  let input = address.toLowerCase().split("%")[0];
  if (input.includes(".")) {
    const lastColon = input.lastIndexOf(":");
    const ipv4 = ipv4Number(input.slice(lastColon + 1));
    if (ipv4 === null) return null;
    input = `${input.slice(0, lastColon)}:${((ipv4 >>> 16) & 0xffff).toString(16)}:${(ipv4 & 0xffff).toString(16)}`;
  }
  const halves = input.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const parts = halves.length === 2 ? [...left, ...Array(missing).fill("0"), ...right] : left;
  if (parts.length !== 8 || parts.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) return null;
  return parts.reduce((value, part) => (value << 16n) | BigInt(`0x${part}`), 0n);
}

export function isPublicIpAddress(address) {
  const family = net.isIP(address);
  if (family === 4) {
    const value = ipv4Number(address);
    const blocked = [
      ["0.0.0.0", 8],
      ["10.0.0.0", 8],
      ["100.64.0.0", 10],
      ["127.0.0.0", 8],
      ["169.254.0.0", 16],
      ["172.16.0.0", 12],
      ["192.0.0.0", 24],
      ["192.0.2.0", 24],
      ["192.88.99.0", 24],
      ["192.168.0.0", 16],
      ["198.18.0.0", 15],
      ["198.51.100.0", 24],
      ["203.0.113.0", 24],
      ["224.0.0.0", 4],
      ["240.0.0.0", 4],
    ];
    return value !== null && !blocked.some(([base, prefix]) => inIpv4Range(value, base, prefix));
  }
  if (family === 6) {
    const value = expandIpv6(address);
    if (value === null) return false;
    const globalUnicastStart = 0x20000000000000000000000000000000n;
    const globalUnicastEnd = 0x40000000000000000000000000000000n;
    const documentationStart = 0x20010db8000000000000000000000000n;
    const documentationEnd = 0x20010db9000000000000000000000000n;
    const protocolAssignmentsStart = 0x20010000000000000000000000000000n;
    const protocolAssignmentsEnd = 0x20010200000000000000000000000000n;
    const sixToFourStart = 0x20020000000000000000000000000000n;
    const sixToFourEnd = 0x20030000000000000000000000000000n;
    return (
      value >= globalUnicastStart &&
      value < globalUnicastEnd &&
      !(value >= documentationStart && value < documentationEnd) &&
      !(value >= protocolAssignmentsStart && value < protocolAssignmentsEnd) &&
      !(value >= sixToFourStart && value < sixToFourEnd)
    );
  }
  return false;
}

export function parsePublicHttpsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new UnsafeImageUrlError("image URL is invalid");
  }
  if (url.protocol !== "https:") throw new UnsafeImageUrlError("image URL must use HTTPS");
  if (url.username || url.password) throw new UnsafeImageUrlError("image URL must not contain credentials");
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (hostname === "localhost" || BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new UnsafeImageUrlError("image URL hostname is not public");
  }
  if (net.isIP(hostname) && !isPublicIpAddress(hostname)) {
    throw new UnsafeImageUrlError("image URL address is not public");
  }
  return url;
}

export async function resolvePublicAddress(hostname, resolver = dns.lookup) {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");
  const entries = await resolver(normalizedHostname, { all: true, verbatim: true });
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new UnsafeImageUrlError("image hostname did not resolve");
  }
  if (entries.some((entry) => !isPublicIpAddress(entry.address))) {
    throw new UnsafeImageUrlError("image hostname resolved to a non-public address");
  }
  return entries[0];
}

function readResponse(response, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    response.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        response.destroy(new Error("image exceeds the 10 MB limit"));
        return;
      }
      chunks.push(chunk);
    });
    response.on("end", () => resolve(Buffer.concat(chunks)));
    response.on("error", reject);
  });
}

async function requestOnce(url, { timeoutMs, resolver }) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const resolved = await resolvePublicAddress(hostname, resolver);
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        headers: {
          Accept: "image/png,image/jpeg,image/webp",
          "User-Agent": "PLUG-Solutions-thumbnail-bot/1.0",
        },
        lookup: (_hostname, _options, callback) => callback(null, resolved.address, resolved.family),
        servername: net.isIP(hostname) ? undefined : hostname,
      },
      (response) => resolve(response),
    );
    request.setTimeout(timeoutMs, () => request.destroy(new Error("image request timed out")));
    request.on("error", reject);
    request.end();
  });
}

export async function downloadPublicImage(
  value,
  { maxBytes = 10 * 1024 * 1024, timeoutMs = 15_000, maxRedirects = 3, resolver = dns.lookup } = {},
) {
  let url = parsePublicHttpsUrl(value);
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    const response = await requestOnce(url, { timeoutMs, resolver });
    if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
      const location = response.headers.location;
      response.resume();
      if (!location) throw new Error("image redirect did not include a location");
      if (redirect === maxRedirects) throw new Error("image exceeded the redirect limit");
      url = parsePublicHttpsUrl(new URL(location, url).href);
      continue;
    }
    if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
      response.resume();
      throw new Error(`image request failed with HTTP ${response.statusCode ?? "unknown"}`);
    }
    const contentLength = Number(response.headers["content-length"] ?? 0);
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
      response.resume();
      throw new Error("image exceeds the 10 MB limit");
    }
    const contentType = String(response.headers["content-type"] ?? "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
      response.resume();
      throw new Error("image response must be PNG, JPEG, or WebP");
    }
    return { bytes: await readResponse(response, maxBytes), contentType };
  }
  throw new Error("image redirect handling failed");
}
