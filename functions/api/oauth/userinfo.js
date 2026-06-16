/**
 * /api/oauth/userinfo — OpenID Connect UserInfo endpoint.
 *
 * Returns claims about the end-user identified by the access token, gated by
 * the scopes the token was granted (OIDC Core §5.3). The access token is the
 * HS256 JWT minted by /api/oauth/token, verified here with the IdP signing
 * secret.
 *
 * This endpoint is advertised in /.well-known/openid-configuration but did not
 * previously exist (it 404'd) — relying parties could not complete an OIDC
 * login.
 */
import { verifyJwtHs256 } from "../../../server/oauth/webcrypto.js";

const DEFAULT_SUPABASE_URL = "https://qnapwukqhybziduhzpow.supabase.co";

function getEnvValue(key, env) {
  if (env && typeof env === "object" && env[key] != null) {
    return String(env[key]);
  }
  if (typeof process !== "undefined" && process?.env?.[key] != null) {
    return process.env[key];
  }
  return "";
}

function getSigningSecret(env) {
  return getEnvValue("ZUUP_OAUTH_SIGNING_SECRET", env) || getEnvValue("ZUUP_CLIENT_SECRET", env) || "";
}

function getSupabaseConfig(env) {
  return {
    url: (getEnvValue("SUPABASE_URL", env) || DEFAULT_SUPABASE_URL).replace(/\/+$/, ""),
    key: getEnvValue("SUPABASE_SERVICE_ROLE_KEY", env),
  };
}

function corsHeaders(origin = "*", extra = {}) {
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    ...extra,
  };
}

function unauthorized(origin, error, description) {
  // RFC 6750 §3 — error info goes in the WWW-Authenticate challenge.
  const challenge = `Bearer error="${error}", error_description="${description}"`;
  return new Response(JSON.stringify({ error, error_description: description }), {
    status: 401,
    headers: corsHeaders(origin, { "WWW-Authenticate": challenge }),
  });
}

function extractBearer(request) {
  const header = request.headers.get("authorization") || "";
  if (/^bearer /i.test(header)) return header.slice(7).trim();
  return "";
}

async function fetchUserProfile(userId, env) {
  const cfg = getSupabaseConfig(env);
  if (!cfg.key || !userId) return null;
  const res = await fetch(`${cfg.url}/auth/v1/admin/users/${userId}`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.user || data || null;
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get("origin") || "*";

  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== "GET" && request.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed", expected: ["GET", "POST", "OPTIONS"] }), {
        status: 405,
        headers: corsHeaders(origin),
      });
    }

    const token = extractBearer(request);
    if (!token) {
      return unauthorized(origin, "invalid_request", "Missing bearer access token");
    }

    const signingSecret = getSigningSecret(env || {});
    if (!signingSecret) {
      return new Response(JSON.stringify({ error: "server_not_configured" }), {
        status: 500,
        headers: corsHeaders(origin),
      });
    }

    const verified = await verifyJwtHs256(token, signingSecret);
    if (!verified.ok) {
      const description = verified.error === "token_expired" ? "The access token has expired" : "The access token is invalid";
      return unauthorized(origin, "invalid_token", description);
    }

    const payload = verified.payload || {};

    // Only access tokens may be presented here. This rejects id_tokens and any
    // other JWT signed with the IdP key (token-type confusion) — userinfo is not
    // an identity-token verification endpoint.
    if (payload.token_use !== "access") {
      return unauthorized(origin, "invalid_token", "Token is not an access token");
    }

    const scopes = String(payload.scope || "").split(/\s+/).filter(Boolean);

    // `sub` is always returned. Everything else is gated by granted scope.
    const claims = { sub: payload.sub };

    const profile = await fetchUserProfile(payload.sub, env || {});
    const meta = profile?.user_metadata || {};

    if (scopes.includes("profile")) {
      claims.name = meta.full_name || payload.name || null;
      claims.family_name = meta.last_name || null;
      claims.preferred_username = meta.username || payload.preferred_username || null;
      claims.picture = meta.avatar_url || payload.picture || null;
    }
    if (scopes.includes("email")) {
      claims.email = profile?.email || payload.email || null;
      claims.email_verified = Boolean(profile?.email_confirmed_at || profile?.confirmed_at);
    }

    return new Response(JSON.stringify(claims), { status: 200, headers: corsHeaders(origin) });
  } catch (error) {
    console.error("userinfo_error", error instanceof Error ? error.message : error);
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500, headers: corsHeaders(origin) });
  }
}
