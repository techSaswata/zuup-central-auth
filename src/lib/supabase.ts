import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const AUTH_BASE_URL = "https://auth.zuup.dev";

export const OAUTH_ENDPOINTS = {
  authorization: `${AUTH_BASE_URL}/authorize`,
  token: `${AUTH_BASE_URL}/api/oauth/token`,
  userinfo: `${AUTH_BASE_URL}/api/oauth/userinfo`,
  jwks: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  oidcDiscovery: `${SUPABASE_URL}/auth/v1/.well-known/openid-configuration`,
  revocation: `${SUPABASE_URL}/auth/v1/logout`,
};

export { SUPABASE_URL, SUPABASE_ANON_KEY };
