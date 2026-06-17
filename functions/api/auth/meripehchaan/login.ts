interface Env {
  MERIPEHCHAAN_CLIENT_ID: string;
  MERIPEHCHAAN_REDIRECT_URI: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  
  const clientId = env.MERIPEHCHAAN_CLIENT_ID || 'PZD7C82884';
  const redirectUri = env.MERIPEHCHAAN_REDIRECT_URI || 'http://localhost:8080/api/auth/meripehchaan/callback';
  
  const stateData = JSON.stringify({ uuid: crypto.randomUUID(), userId });
  const state = btoa(stateData);
  
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const code_verifier = Array.from(array, dec => dec.toString(16).padStart(2, "0")).join('');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(code_verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const code_challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const authUrl = new URL('https://digilocker.meripehchaan.gov.in/public/oauth2/1/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', code_challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('dl_flow', 'signin');
  authUrl.searchParams.set('acr', 'aadhaar');
  authUrl.searchParams.set('amr', 'aadhaar');
  authUrl.searchParams.set('scope', 'openid userdetails careof address picture avs');
  
  const res = new Response(null, {
    status: 302,
    headers: { 
      Location: authUrl.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  
  res.headers.append('Set-Cookie', `meripehchaan_state=${state}; Path=/; HttpOnly; Max-Age=600`);
  res.headers.append('Set-Cookie', `meripehchaan_cv=${code_verifier}; Path=/; HttpOnly; Max-Age=600`);
  return res;
};
