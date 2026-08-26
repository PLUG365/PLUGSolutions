import assert from "node:assert/strict";
import test from "node:test";
import {
  createPinnedLookup,
  isPublicIpAddress,
  parsePublicHttpsUrl,
  resolvePublicAddress,
  UnsafeImageUrlError,
} from "../lib/public-image-url.mjs";

function invokeLookup(lookup, options) {
  return new Promise((resolve, reject) => {
    lookup("ignored.example", options, (error, address, family) => {
      if (error) reject(error);
      else resolve({ address, family });
    });
  });
}

test("public image URLs require HTTPS and omit credentials", () => {
  assert.equal(parsePublicHttpsUrl("https://images.example.com/a.png").protocol, "https:");
  for (const value of [
    "http://images.example.com/a.png",
    "https://user:password@images.example.com/a.png",
    "https://localhost/a.png",
    "https://service.internal/a.png",
    "https://127.0.0.1/a.png",
    "https://[::1]/a.png",
  ]) {
    assert.throws(() => parsePublicHttpsUrl(value), UnsafeImageUrlError);
  }
});

test("private, loopback, link-local, documentation, and multicast IPs are blocked", () => {
  for (const address of [
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.1.1",
    "192.168.1.1",
    "192.0.2.1",
    "198.51.100.5",
    "203.0.113.9",
    "224.0.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
    "2001:db8::1",
  ]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
  assert.equal(isPublicIpAddress("2606:4700:4700::1111"), true);
});

test("DNS rebinding candidates are rejected when any answer is non-public", async () => {
  await assert.rejects(
    resolvePublicAddress("images.example.com", async () => [
      { address: "8.8.8.8", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]),
    UnsafeImageUrlError,
  );
  assert.deepEqual(
    await resolvePublicAddress("images.example.com", async () => [
      { address: "8.8.8.8", family: 4 },
      { address: "1.1.1.1", family: 4 },
    ]),
    { address: "8.8.8.8", family: 4 },
  );
});

test("pinned DNS lookup supports scalar and Node 22 multi-address callbacks", async () => {
  const pinned = { address: "8.8.8.8", family: 4 };
  const lookup = createPinnedLookup(pinned);

  assert.deepEqual(await invokeLookup(lookup, {}), pinned);
  assert.deepEqual(await invokeLookup(lookup, { all: true }), {
    address: [pinned],
    family: undefined,
  });
});
