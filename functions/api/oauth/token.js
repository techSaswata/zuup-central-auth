import { findClientById } from "../../../server/oauth/clients.js";
import {
  signJwtHs256,
  sha256Base64Url,
  sha256Hex,
  leftHalfHash,
  generateOpaqueToken,
  timingSafeEqual,
} from "../../../server/oauth/webcrypto.js";

const DEFAULT_SUPABASE_URL = "https://qnapwukqhybziduhzpow.supabase.co";
const DEFAULT_CODES_TABLE = "oauth_authorization_codes";
const DEFAULT_CLIENTS_TABLE = "oauth_clients";
const DEFAULT_REFRESH_TABLE = "oauth_refresh_tokens";

const ACCESS_TOKEN_TTL = 3600; // 1 hour
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // sliding window: 30 days
const REFRESH_ABSOLUTE_TTL = 90 * 24 * 60 * 60; // hard cap anchored to auth_time: 90 days
const REFRESH_GRACE_MS = 10000; // tolerate a benign concurrent refresh of the same token

function corsHeaders(origin = "*") {
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  };
}

function jsonError(error, status, origin, extra = {}) {
  return new Response(JSON.stringify({ error, ...extra }), { status, headers: corsHeaders(origin) });
}

function getEnvValue(key, env) {
  if (env && typeof env === "object" && env[key] != null) {
    return String(env[key]);
  }
  if (typeof process !== "undefined" && process?.env?.[key] != null) {
    return process.env[key];
  }
  return "";
}

function getSupabaseConfig(env) {
  return {
    url: (getEnvValue("SUPABASE_URL", env) || DEFAULT_SUPABASE_URL).replace(/\/+$/, ""),
    key: getEnvValue("SUPABASE_SERVICE_ROLE_KEY", env),
    codesTable: getEnvValue("ZUUP_OAUTH_CODES_TABLE", env) || DEFAULT_CODES_TABLE,
    clientsTable: getEnvValue("ZUUP_OAUTH_CLIENTS_TABLE", env) || DEFAULT_CLIENTS_TABLE,
    refreshTable: getEnvValue("ZUUP_OAUTH_REFRESH_TABLE", env) || DEFAULT_REFRESH_TABLE,
  };
}

function getIssuer(env) {
  return (getEnvValue("ZUUP_ISSUER", env) || "https://auth.zuup.dev").replace(/\/+$/, "");
}

function getSigningSecret(env) {
  return getEnvValue("ZUUP_OAUTH_SIGNING_SECRET", env) || getEnvValue("ZUUP_CLIENT_SECRET", env) || "";
}

function supabaseHeaders(cfg, extra = {}) {
  return {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    Accept: "application/json",
    ...extra,
  };
}

function parseBasicAuthClient(authHeader) {
  if (!authHeader || typeof authHeader !== "string") return { clientId: "", clientSecret: "" };
  if (!authHeader.toLowerCase().startsWith("basic ")) return { clientId: "", clientSecret: "" };

  try {
    const raw = atob(authHeader.slice(6).trim());
    const idx = raw.indexOf(":");
    if (idx < 0) return { clientId: "", clientSecret: "" };
    return { clientId: raw.slice(0, idx), clientSecret: raw.slice(idx + 1) };
  } catch {
    return { clientId: "", clientSecret: "" };
  }
}

/**
 * Look up a client's registered secret. Returns a discriminated result so the
 * caller can tell "no row registered" (a genuine public client) apart from
 * "lookup failed". This FAILS CLOSED: a backend error throws (→ the request is
 * rejected) rather than returning null, which would silently downgrade a
 * confidential client to public during a transient Supabase outage.
 */
async function fetchClientSecret(clientId, env) {
  if (!clientId) return { found: false, secret: "" };
  const cfg = getSupabaseConfig(env);
  if (!cfg.key) return { found: false, secret: "" };

  const query = new URLSearchParams({ client_id: `eq.${clientId}`, select: "client_secret", limit: "1" });
  const res = await fetch(`${cfg.url}/rest/v1/${cfg.clientsTable}?${query.toString()}`, {
    headers: supabaseHeaders(cfg),
  });
  if (!res.ok) throw new Error(`client_secret_lookup_failed:${res.status}`);
  const rows = await res.json();
  if (!rows?.length) return { found: false, secret: "" };
  return { found: true, secret: rows[0].client_secret || "" };
}

/**
 * Resolve and AUTHENTICATE the client making the token request.
 *
 * Security model (OAuth 2.1 / RFC 6749 §3.2.1):
 *   - The client_id MUST be registered (static registry, env, or oauth_clients).
 *     Unknown client_ids are rejected with invalid_client.
 *   - Confidential clients (a client_secret is registered) MUST present a
 *     matching secret. A missing or wrong secret is rejected.
 *   - Public clients (registered, no secret) authenticate via PKCE only; the
 *     caller enforces that the authorization code carried a code_challenge.
 *
 * Previously the secret was only checked *if supplied*, so anyone who knew a
 * client_id and obtained an authorization code could redeem it with no secret.
 */
async function resolveClientCredentials(request, body, env) {
  const basic = parseBasicAuthClient(request.headers.get("authorization") || "");
  const clientId = basic.clientId || body?.client_id || "";
  const providedSecret = basic.clientSecret || body?.client_secret || "";

  const singleClientId = getEnvValue("ZUUP_CLIENT_ID", env);
  const singleClientSecret = getEnvValue("ZUUP_CLIENT_SECRET", env);

  if (!clientId) {
    if (singleClientId && singleClientSecret) {
      if (!providedSecret || !(await timingSafeEqual(providedSecret, singleClientSecret))) {
        return { error: "invalid_client", msg: "Client authentication required" };
      }
      return { clientId: singleClientId, clientSecret: singleClientSecret, isPublic: false };
    }
    return { error: "invalid_client", msg: "Missing client_id" };
  }

  // The client must be registered. Treating unknown client_ids as public would
  // let the IdP implicitly register arbitrary clients.
  const registered = await findClientById(clientId, env);
  if (!registered) {
    return { error: "invalid_client", msg: "Unknown client_id" };
  }

  // A row in oauth_clients means the client is confidential by intent.
  const dbResult = await fetchClientSecret(clientId, env);
  if (dbResult.found) {
    if (!dbResult.secret) {
      // Confidential-by-intent but provisioned with a blank secret → reject,
      // never silently treat as public.
      return { error: "invalid_client", msg: "Client is misconfigured (empty secret)" };
    }
    if (!providedSecret || !(await timingSafeEqual(providedSecret, dbResult.secret))) {
      return {
        error: "invalid_client",
        msg: providedSecret ? "Invalid client_secret" : "Client authentication required for confidential client",
      };
    }
    return { clientId, clientSecret: dbResult.secret, isPublic: false };
  }

  // No DB row, but it may be the env single-client.
  if (clientId === singleClientId && singleClientSecret) {
    if (!providedSecret || !(await timingSafeEqual(providedSecret, singleClientSecret))) {
      return { error: "invalid_client", msg: "Client authentication required" };
    }
    return { clientId, clientSecret: singleClientSecret, isPublic: false };
  }

  // Registered (static/metadata) with no secret → public client. PKCE enforced downstream.
  return { clientId, clientSecret: "", isPublic: true };
}

/**
 * Atomically consume an authorization code. The conditional `used=eq.false`
 * PATCH guarantees that of N concurrent exchanges of the same code, exactly one
 * sees a non-empty result; the rest are reported as replays.
 */
async function consumeServerCode(code, env) {
  const cfg = getSupabaseConfig(env);
  if (!cfg.key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  const selectQuery = new URLSearchParams({ code: `eq.${code}`, limit: "1" });
  const getRes = await fetch(`${cfg.url}/rest/v1/${cfg.codesTable}?${selectQuery.toString()}`, {
    headers: supabaseHeaders(cfg),
  });
  if (!getRes.ok) throw new Error(`code_fetch_failed:${getRes.status}`);

  const rows = await getRes.json();
  const entry = rows?.[0] || null;
  if (!entry) return null;
  if (entry.used) return { replayed: true, entry };
  if (new Date(entry.expires_at).getTime() <= Date.now()) return null;

  const patchQuery = new URLSearchParams({ code: `eq.${code}`, used: "eq.false" });
  const patchRes = await fetch(`${cfg.url}/rest/v1/${cfg.codesTable}?${patchQuery.toString()}`, {
    method: "PATCH",
    headers: supabaseHeaders(cfg, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ used: true, consumed_at: new Date().toISOString() }),
  });
  if (!patchRes.ok) throw new Error(`code_mark_used_failed:${patchRes.status}`);

  const updated = await patchRes.json().catch(() => []);
  if (Array.isArray(updated) && updated.length === 0) {
    return { replayed: true, entry };
  }
  return { entry };
}

async function fetchUserProfile(userId, env) {
  if (!userId) return null;
  const cfg = getSupabaseConfig(env);
  if (!cfg.key) return null;

  const res = await fetch(`${cfg.url}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user || data || null;
}

// ─── refresh token storage (rotation + reuse detection) ──────────────────────

async function storeRefreshToken(token, meta, env) {
  const cfg = getSupabaseConfig(env);
  if (!cfg.key) throw new Error("missing_supabase_service_role_key");

  // Sliding window, hard-capped by an absolute lifetime anchored to the original
  // authentication, so a chain cannot live forever via repeated in-window refresh.
  const slidingMs = Date.now() + REFRESH_TOKEN_TTL * 1000;
  const absoluteMs = meta.auth_time ? (meta.auth_time + REFRESH_ABSOLUTE_TTL) * 1000 : slidingMs;

  const entry = {
    token_hash: await sha256Hex(token),
    client_id: meta.client_id,
    user_id: meta.user_id,
    scopes: meta.scopes || [],
    nonce: meta.nonce || null,
    auth_time: meta.auth_time || null,
    expires_at: new Date(Math.min(slidingMs, absoluteMs)).toISOString(),
    revoked: false,
    created_at: new Date().toISOString(),
  };
  const res = await fetch(`${cfg.url}/rest/v1/${cfg.refreshTable}`, {
    method: "POST",
    headers: supabaseHeaders(cfg, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(`refresh_store_failed:${res.status}`);
}

async function findRefreshToken(token, env) {
  const cfg = getSupabaseConfig(env);
  if (!cfg.key) return null;
  const hash = await sha256Hex(token);
  const query = new URLSearchParams({ token_hash: `eq.${hash}`, limit: "1" });
  const res = await fetch(`${cfg.url}/rest/v1/${cfg.refreshTable}?${query.toString()}`, {
    headers: supabaseHeaders(cfg),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0] || null;
}

/**
 * Atomically claim (revoke) the presented refresh token. Returns the row if this
 * call flipped it from live→revoked, or null if it was already revoked / lost a
 * concurrent race — i.e. a replay. This is what makes rotation race-free: only
 * one of N concurrent uses of the same token can win.
 */
async function claimRefreshToken(hash, env) {
  const cfg = getSupabaseConfig(env);
  if (!cfg.key) throw new Error("missing_supabase_service_role_key");
  const query = new URLSearchParams({ token_hash: `eq.${hash}`, revoked: "eq.false" });
  const res = await fetch(`${cfg.url}/rest/v1/${cfg.refreshTable}?${query.toString()}`, {
    method: "PATCH",
    headers: supabaseHeaders(cfg, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ revoked: true, consumed_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`refresh_claim_failed:${res.status}`);
  const rows = await res.json().catch(() => []);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function linkRotation(hash, successorHash, env) {
  const cfg = getSupabaseConfig(env);
  if (!cfg.key) return;
  const query = new URLSearchParams({ token_hash: `eq.${hash}` });
  await fetch(`${cfg.url}/rest/v1/${cfg.refreshTable}?${query.toString()}`, {
    method: "PATCH",
    headers: supabaseHeaders(cfg, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ rotated_to: successorHash }),
  }).catch(() => {});
}

/**
 * Reuse detection: a refresh token presented after it was already rotated/revoked
 * means a stolen token was replayed. Revoke every live token in that (client, user)
 * family so both attacker and victim are cut off (OAuth 2.1 §4.13.2). Throws on
 * failure so a failed security-critical revoke is surfaced, never silently dropped.
 */
async function revokeRefreshTokenFamily(clientId, userId, env) {
  const cfg = getSupabaseConfig(env);
  if (!cfg.key) throw new Error("missing_supabase_service_role_key");
  const query = new URLSearchParams({
    client_id: `eq.${clientId}`,
    user_id: `eq.${userId}`,
    revoked: "eq.false",
  });
  const res = await fetch(`${cfg.url}/rest/v1/${cfg.refreshTable}?${query.toString()}`, {
    method: "PATCH",
    headers: supabaseHeaders(cfg, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ revoked: true }),
  });
  if (!res.ok) throw new Error(`family_revoke_failed:${res.status}`);
}

// ─── token minting ───────────────────────────────────────────────────────────

function profileClaims(profile, scopes) {
  const meta = profile?.user_metadata || {};
  const claims = {};
  if (scopes.includes("profile")) {
    claims.name = meta.full_name || null;
    claims.family_name = meta.last_name || null;
    claims.preferred_username = meta.username || null;
    claims.picture = meta.avatar_url || null;
  }
  if (scopes.includes("email")) {
    claims.email = profile?.email || null;
    claims.email_verified = Boolean(profile?.email_confirmed_at || profile?.confirmed_at);
  }
  return claims;
}

/**
 * Mint the response for an authenticated, validated grant.
 *   - access_token: HS256 JWT signed with the IdP signing secret (verified by /userinfo).
 *   - id_token: OIDC token, issued ONLY to confidential clients and signed HS256
 *     with the client's secret, so the relying party can verify it with the
 *     credential it already holds. Public clients receive no id_token and must
 *     use /userinfo for identity (asymmetric RS256/JWKS signing is the planned
 *     path for verifiable public-client id_tokens — see README).
 *   - refresh_token: rotating, issued when offline_access is granted. Storage
 *     failure is non-fatal so it can never take down access/id token issuance.
 */
async function mintTokens({ client, userId, scopes, nonce, authTime, env }) {
  const signingSecret = getSigningSecret(env);
  if (!signingSecret) {
    return { error: "server_error", msg: "Missing signing secret", status: 500 };
  }

  const now = Math.floor(Date.now() / 1000);
  const issuer = getIssuer(env);
  const scopeString = scopes.join(" ");
  const profile = await fetchUserProfile(userId, env);

  const accessToken = await signJwtHs256(
    {
      iss: issuer,
      sub: userId,
      aud: client.clientId,
      iat: now,
      exp: now + ACCESS_TOKEN_TTL,
      scope: scopeString,
      jti: generateOpaqueToken(12),
      token_use: "access",
      ...profileClaims(profile, scopes),
    },
    signingSecret
  );

  const response = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL,
    scope: scopeString,
  };

  // id_token only for confidential clients (we must have a key the RP can verify with).
  if (scopes.includes("openid") && client.clientSecret) {
    const idPayload = {
      iss: issuer,
      sub: userId,
      aud: client.clientId,
      iat: now,
      exp: now + ACCESS_TOKEN_TTL,
      auth_time: authTime || now,
      at_hash: await leftHalfHash(accessToken),
      token_use: "id",
      ...profileClaims(profile, scopes),
    };
    if (nonce) idPayload.nonce = nonce;
    response.id_token = await signJwtHs256(idPayload, client.clientSecret);
  }

  if (scopes.includes("offline_access")) {
    const refreshToken = `zuup_rt_${generateOpaqueToken(32)}`;
    try {
      await storeRefreshToken(
        refreshToken,
        { client_id: client.clientId, user_id: userId, scopes, nonce, auth_time: authTime || now },
        env
      );
      response.refresh_token = refreshToken;
    } catch (err) {
      // Non-fatal: the caller still receives a valid access/id token.
      console.error("refresh_store_failed", err instanceof Error ? err.message : err);
    }
  }

  return { response };
}

// ─── grant handlers ───────────────────────────────────────────────────────────

async function handleAuthorizationCode(body, client, origin, env) {
  const { code, redirect_uri, code_verifier } = body || {};
  if (!code || !redirect_uri) {
    return jsonError("invalid_request", 400, origin, { error_description: "Missing code or redirect_uri" });
  }

  const consumed = await consumeServerCode(code, env);
  if (!consumed) {
    return jsonError("invalid_grant", 400, origin, { error_description: "Invalid or expired authorization code" });
  }
  if (consumed.replayed) {
    // A consumed code was presented again. We do NOT mass-revoke here: an
    // unredeemed replay never minted tokens, and revoking by (client,user)
    // would be a forced-logout vector. Simply reject the replay.
    return jsonError("invalid_grant", 400, origin, { error_description: "Authorization code already used" });
  }

  const authCode = consumed.entry;
  if (authCode.client_id !== client.clientId) {
    return jsonError("invalid_grant", 400, origin, { error_description: "client_id mismatch" });
  }
  if (authCode.redirect_uri !== redirect_uri) {
    return jsonError("invalid_grant", 400, origin, { error_description: "redirect_uri mismatch" });
  }

  // PKCE. Mandatory for public clients; verified for everyone when a challenge was bound.
  if (authCode.code_challenge) {
    if (!code_verifier) {
      return jsonError("invalid_request", 400, origin, { error_description: "code_verifier required" });
    }
    const method = authCode.code_challenge_method || "S256";
    if (method !== "S256") {
      return jsonError("invalid_request", 400, origin, { error_description: `Unsupported code_challenge_method: ${method}` });
    }
    const digest = await sha256Base64Url(code_verifier);
    if (!(await timingSafeEqual(digest, authCode.code_challenge))) {
      return jsonError("invalid_grant", 400, origin, { error_description: "PKCE verification failed" });
    }
  } else if (client.isPublic) {
    return jsonError("invalid_grant", 400, origin, {
      error_description: "PKCE is required for public clients (no client_secret). Send code_challenge on /authorize.",
    });
  }

  const scopes = Array.isArray(authCode.scopes) ? authCode.scopes : [];
  const minted = await mintTokens({
    client,
    userId: authCode.user_id,
    scopes,
    nonce: authCode.nonce || null,
    authTime: authCode.auth_time || null,
    env,
  });
  if (minted.error) return jsonError(minted.error, minted.status || 500, origin, { error_description: minted.msg });

  return new Response(JSON.stringify(minted.response), { status: 200, headers: corsHeaders(origin) });
}

async function handleRefreshToken(body, client, origin, env) {
  const presented = body?.refresh_token || "";
  if (!presented) {
    return jsonError("invalid_request", 400, origin, { error_description: "Missing refresh_token" });
  }

  const stored = await findRefreshToken(presented, env);
  if (!stored) {
    return jsonError("invalid_grant", 400, origin, { error_description: "Unknown refresh_token" });
  }
  if (stored.client_id !== client.clientId) {
    return jsonError("invalid_grant", 400, origin, { error_description: "refresh_token was not issued to this client" });
  }
  if (new Date(stored.expires_at).getTime() <= Date.now()) {
    return jsonError("invalid_grant", 400, origin, { error_description: "refresh_token expired" });
  }

  // Validate the requested scope BEFORE consuming the token, so a bad request
  // doesn't burn a still-valid refresh token. A refresh may narrow scope, never widen.
  const grantedScopes = Array.isArray(stored.scopes) ? stored.scopes : [];
  let scopes = grantedScopes;
  if (body?.scope) {
    const requested = String(body.scope).split(/\s+/).filter(Boolean);
    const widened = requested.filter((s) => !grantedScopes.includes(s));
    if (widened.length) {
      return jsonError("invalid_scope", 400, origin, { error_description: `Cannot widen scope: ${widened.join(", ")}` });
    }
    scopes = requested;
  }

  // Atomically claim the token. A null result means it was already revoked or
  // another request won the race.
  const claimed = await claimRefreshToken(stored.token_hash, env);
  if (!claimed) {
    // Distinguish genuine reuse (a stale token replayed long after it was
    // rotated) from a benign concurrent retry (two requests raced on the same
    // live token). A token consumed within the grace window means a sibling
    // request just rotated it — reject without nuking the user's whole family.
    const current = await findRefreshToken(presented, env);
    const consumedAt = current?.consumed_at ? new Date(current.consumed_at).getTime() : 0;
    if (consumedAt && Date.now() - consumedAt <= REFRESH_GRACE_MS) {
      return jsonError("invalid_grant", 400, origin, { error_description: "Concurrent refresh detected; please retry" });
    }
    await revokeRefreshTokenFamily(stored.client_id, stored.user_id, env);
    return jsonError("invalid_grant", 400, origin, { error_description: "refresh_token has been revoked (reuse detected)" });
  }

  const minted = await mintTokens({
    client,
    userId: stored.user_id,
    scopes,
    nonce: stored.nonce || null,
    authTime: stored.auth_time || null,
    env,
  });
  if (minted.error) return jsonError(minted.error, minted.status || 500, origin, { error_description: minted.msg });

  if (minted.response.refresh_token) {
    await linkRotation(stored.token_hash, await sha256Hex(minted.response.refresh_token), env);
  }

  return new Response(JSON.stringify(minted.response), { status: 200, headers: corsHeaders(origin) });
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get("origin") || "*";

  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "POST") {
      return jsonError("invalid_request", 405, origin, { error_description: "Use POST" });
    }

    // RFC 6749 mandates application/x-www-form-urlencoded; accept JSON too for
    // backwards compatibility with existing Zuup callers.
    let body;
    const contentType = (request.headers.get("content-type") || "").toLowerCase();
    try {
      if (contentType.includes("application/x-www-form-urlencoded")) {
        body = Object.fromEntries(new URLSearchParams(await request.text()).entries());
      } else {
        body = await request.json();
      }
    } catch {
      return jsonError("invalid_request", 400, origin, { error_description: "Malformed request body" });
    }

    const grantType = body?.grant_type || "authorization_code";
    if (grantType !== "authorization_code" && grantType !== "refresh_token") {
      return jsonError("unsupported_grant_type", 400, origin);
    }

    const client = await resolveClientCredentials(request, body || {}, env || {});
    if (client.error) {
      return jsonError("invalid_client", 401, origin, { error_description: client.msg });
    }

    if (grantType === "refresh_token") {
      return await handleRefreshToken(body || {}, client, origin, env || {});
    }
    return await handleAuthorizationCode(body || {}, client, origin, env || {});
  } catch (error) {
    // Never echo internal/upstream detail to the client (schema/RLS disclosure).
    console.error("token_endpoint_error", error instanceof Error ? error.message : error);
    return jsonError("server_error", 500, origin, { error_description: "Internal error during token exchange" });
  }
}
