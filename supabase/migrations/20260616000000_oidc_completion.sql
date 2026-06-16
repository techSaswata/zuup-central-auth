-- OpenID Connect completion: id_token replay protection + refresh tokens.
--
-- Apply this BEFORE deploying the updated Pages Functions. The worker is written
-- to degrade gracefully if these objects are missing (authorization codes are
-- inserted without nonce/auth_time, and refresh-token storage is skipped), but
-- offline_access and the nonce/auth_time id_token claims only work once applied.
-- Re-runnable: every statement is idempotent.

-- nonce + auth_time so the id_token can satisfy OIDC replay protection (nonce)
-- and report when the end-user authenticated (auth_time).
alter table public.oauth_authorization_codes add column if not exists nonce text;
alter table public.oauth_authorization_codes add column if not exists auth_time bigint;

-- Refresh tokens (offline_access) with rotation + reuse detection.
create table if not exists public.oauth_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,   -- SHA-256 of the token; the raw token is never stored
  client_id text not null,
  user_id text not null,
  scopes jsonb not null default '[]'::jsonb,
  nonce text,
  auth_time bigint,
  expires_at timestamptz not null,
  revoked boolean not null default false,
  rotated_to text,                   -- token_hash of the successor token (rotation chain)
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);

create index if not exists oauth_refresh_tokens_client_id_idx
  on public.oauth_refresh_tokens (client_id);
create index if not exists oauth_refresh_tokens_user_id_idx
  on public.oauth_refresh_tokens (user_id);
create index if not exists oauth_refresh_tokens_expires_at_idx
  on public.oauth_refresh_tokens (expires_at);
-- Supports the atomic claim (token_hash + revoked) and family revoke (client_id + user_id + revoked).
create index if not exists oauth_refresh_tokens_family_idx
  on public.oauth_refresh_tokens (client_id, user_id, revoked);
