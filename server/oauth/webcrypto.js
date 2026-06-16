/**
 * Runtime-agnostic OAuth/OIDC crypto primitives.
 *
 * Uses only the WebCrypto + base64 globals (`crypto.subtle`, `btoa`, `atob`,
 * `TextEncoder`, `TextDecoder`) that are available in BOTH the Cloudflare
 * Workers runtime (where the `functions/` Pages Functions run) and modern
 * Node (where the test suite runs). This is intentionally free of `node:crypto`
 * so the same code path that ships to production is the one we test.
 *
 * Previously these helpers were copy-pasted into each Pages Function; sharing
 * them keeps the token endpoint and the userinfo endpoint byte-for-byte
 * consistent on signing/verification.
 */

// ─── base64url ────────────────────────────────────────────────────────────────

export function base64UrlEncodeBytes(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function base64UrlEncodeText(text) {
  return base64UrlEncodeBytes(new TextEncoder().encode(text));
}

export function base64UrlToBytes(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function base64UrlDecodeToText(value) {
  return new TextDecoder().decode(base64UrlToBytes(value));
}

// ─── hashing ────────────────────────────────────────────────────────────────

export async function sha256Bytes(input) {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

export async function sha256Base64Url(input) {
  return base64UrlEncodeBytes(await sha256Bytes(input));
}

export async function sha256Hex(input) {
  const bytes = await sha256Bytes(input);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * OIDC `at_hash` / `c_hash`: base64url of the left-most half of the SHA-256
 * of the token (16 bytes for the 256-bit hash used with HS256/RS256).
 */
export async function leftHalfHash(token) {
  const bytes = await sha256Bytes(token);
  return base64UrlEncodeBytes(bytes.slice(0, bytes.length / 2));
}

// ─── HS256 JWT ────────────────────────────────────────────────────────────────

async function importHmacKey(secret, usages) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages
  );
}

export async function signJwtHs256(payload, secret, header = { alg: "HS256", typ: "JWT" }) {
  const encodedHeader = base64UrlEncodeText(JSON.stringify(header));
  const encodedPayload = base64UrlEncodeText(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const key = await importHmacKey(secret, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64UrlEncodeBytes(new Uint8Array(sig))}`;
}

/**
 * Verify an HS256 JWT signature (constant-time via WebCrypto `verify`) and that
 * it is not expired. Returns `{ ok, payload }` or `{ ok: false, error }`.
 */
export async function verifyJwtHs256(token, secret) {
  if (!token || typeof token !== "string") return { ok: false, error: "invalid_token" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, error: "invalid_token" };

  const [encodedHeader, encodedPayload, encodedSig] = parts;
  const unsigned = `${encodedHeader}.${encodedPayload}`;

  let valid = false;
  try {
    const key = await importHmacKey(secret, ["verify"]);
    valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(encodedSig), new TextEncoder().encode(unsigned));
  } catch {
    return { ok: false, error: "invalid_signature" };
  }
  if (!valid) return { ok: false, error: "invalid_signature" };

  try {
    const payload = JSON.parse(base64UrlDecodeToText(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload?.exp && now > payload.exp) return { ok: false, error: "token_expired" };
    if (payload?.nbf && now < payload.nbf) return { ok: false, error: "token_not_yet_valid" };
    return { ok: true, payload };
  } catch {
    return { ok: false, error: "invalid_payload" };
  }
}

// ─── misc ────────────────────────────────────────────────────────────────────

export function generateOpaqueToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Length-independent, constant-time string comparison.
 *
 * Uses the double-HMAC trick: HMAC both inputs under a fresh random key and
 * compare the fixed-size 32-byte digests. This leaks neither the contents nor
 * the length of the secret (unlike `a === b`, which short-circuits on the first
 * differing byte). Critical for comparing client secrets and PKCE verifiers.
 */
export async function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const enc = new TextEncoder();
  const ha = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(a)));
  const hb = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(b)));
  let diff = ha.length ^ hb.length;
  for (let i = 0; i < ha.length; i += 1) {
    diff |= ha[i] ^ hb[i];
  }
  return diff === 0;
}
