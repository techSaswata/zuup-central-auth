import { createClient } from '@supabase/supabase-js';

interface Env {
  MERIPEHCHAAN_CLIENT_ID: string;
  MERIPEHCHAAN_CLIENT_SECRET: string;
  MERIPEHCHAAN_REDIRECT_URI: string;
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_SERVICE_ROLE_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  const cookieHeader = request.headers.get('Cookie') || '';
  const storedStateMatch = cookieHeader.match(/meripehchaan_state=([^;]+)/);
  const storedState = storedStateMatch ? storedStateMatch[1] : null;
  const storedCvMatch = cookieHeader.match(/meripehchaan_cv=([^;]+)/);
  const code_verifier = storedCvMatch ? storedCvMatch[1] : null;

  if (!code || state !== storedState || !code_verifier) {
    return new Response(JSON.stringify({ error: 'Invalid or missing authorization code, state, or verifier' }), { status: 400 });
  }

  let userId: string | null = null;
  try {
    const decoded = JSON.parse(atob(state));
    userId = decoded.userId;
  } catch(e) {}

  const clientId = env.MERIPEHCHAAN_CLIENT_ID || 'PZD7C82884';
  const clientSecret = env.MERIPEHCHAAN_CLIENT_SECRET;
  const redirectUri = env.MERIPEHCHAAN_REDIRECT_URI || 'http://localhost:8080/api/auth/meripehchaan/callback';

  if (!clientSecret) {
    return new Response(JSON.stringify({ error: 'MERIPEHCHAAN_CLIENT_SECRET is not configured' }), { status: 500 });
  }

  try {
    const tokenRes = await fetch('https://digilocker.meripehchaan.gov.in/public/oauth2/2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`)
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        code_verifier: code_verifier
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to exchange token', details: tokenData }), { status: 400 });
    }

    const accessToken = tokenData.access_token;
    
    // Decode the id_token to get the user's Aadhaar data
    let aadhaarData: any = {};
    if (tokenData.id_token) {
      try {
        const payloadBase64 = tokenData.id_token.split('.')[1];
        aadhaarData = JSON.parse(atob(payloadBase64));
      } catch (e) {
        console.error("Failed to parse id_token", e);
      }
    }

    const profileRes = await fetch('https://digilocker.meripehchaan.gov.in/public/oauth2/1/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const profileData = await profileRes.json();
    
    let debugXmlStr = '';
    // Fetch e-Aadhaar XML
    let photoBase64 = '';
    let addressObj: any = null;
    try {
      const xmlRes = await fetch('https://digilocker.meripehchaan.gov.in/public/oauth2/3/xml/eaadhaar', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (xmlRes.ok) {
        const xmlText = await xmlRes.text();
        debugXmlStr = xmlText.slice(0, 500); // save the first 500 chars for debugging
        const photoMatch = xmlText.match(/<(?:Photo|Pht|photo|pht)[^>]*>([^<]+)<\/(?:Photo|Pht|photo|pht)>/i) || xmlText.match(/(?:photo|pht)="([^"]+)"/i);
        if (photoMatch && photoMatch[1]) {
          photoBase64 = photoMatch[1];
        }
        
        const poaMatch = xmlText.match(/<Poa\s+([^>]+)>/i) || xmlText.match(/<poa\s+([^>]+)>/i);
        if (poaMatch && poaMatch[1]) {
           const attr = poaMatch[1];
           const getAttr = (name: string) => {
              const m = attr.match(new RegExp(`${name}="([^"]*)"`, 'i'));
              return m ? m[1] : '';
           };
           addressObj = {
             address_line1: [getAttr('house'), getAttr('street'), getAttr('lm')].filter(Boolean).join(', '),
             address_line2: [getAttr('co')].filter(Boolean).join(', '),
             city: getAttr('loc') || getAttr('vtc') || getAttr('dist'),
             state_region: getAttr('state'),
             postal_code: getAttr('pc'),
             country: "India"
           };
        }
      } else {
        const errText = await xmlRes.text();
        debugXmlStr = "ERROR: " + errText.slice(0, 500);
      }
    } catch(e: any) {
      debugXmlStr = "EXCEPTION: " + e.message;
      console.error("Failed to fetch XML", e);
    }
    
    // Fallback to OpenID claims if requested scopes returned them
    if (!photoBase64 && aadhaarData.picture) {
      photoBase64 = aadhaarData.picture;
    }
    if (!addressObj && aadhaarData.address) {
      if (typeof aadhaarData.address === 'object') {
        const a = aadhaarData.address;
        
        let cityStr = a.locality || a.vtc || a.city || a.district || a.dist || '';
        let line1Str = a.street_address || a.formatted || a.house || a.houseNumber || a.street || '';
        
        // Government OIDC often puts house numbers into locality. If city contains numbers, move it to line 1.
        if (cityStr && /\d/.test(cityStr)) {
           line1Str = [line1Str, cityStr].filter(Boolean).join(', ');
           cityStr = a.district || a.dist || '';
        }
        
        if (a.careOf) {
           line1Str = [a.careOf, line1Str].filter(Boolean).join(', ');
        }
        
        if (!line1Str) {
           line1Str = Object.values(a).filter(x => typeof x === 'string').join(', ');
        }
        
        addressObj = {
          address_line1: line1Str,
          city: cityStr,
          state_region: a.region || a.state || '',
          postal_code: a.postal_code || a.pincode || a.pc || '',
          country: a.country || 'India'
        };
      } else {
        addressObj = {
          address_line1: aadhaarData.address || '',
          city: '', state_region: '', postal_code: '', country: 'India'
        };
      }
    }
    
    // Update Supabase user metadata with Aadhaar verification details
    if (userId && env.VITE_SUPABASE_URL && env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      
      const last4 = aadhaarData.masked_aadhaar ? aadhaarData.masked_aadhaar.slice(-4) : 'VERI';
      const fullName = aadhaarData.name || profileData.name || '';
      const dob = aadhaarData.birthdate || profileData.dob || '';
      const gender = aadhaarData.gender || profileData.gender || '';
      const phoneNum = aadhaarData.phone_number || profileData.mobile || profileData.phone || aadhaarData.mobile || '';
      
      const metaPayload: any = { 
        aadhaar_last4: last4,
        full_name: fullName,
        dob: dob,
        gender: gender,
        verification_method: 'meripehchaan'
      };
      
      if (phoneNum) {
        metaPayload.phone = phoneNum.replace(/[^0-9]/g, '');
        metaPayload.phone_verified = true;
      }
      
      if (photoBase64) {
        metaPayload.avatar_url = photoBase64.startsWith('http') ? photoBase64 : `data:image/jpeg;base64,${photoBase64}`;
      }
      if (addressObj) {
        if (addressObj.address_line1) metaPayload.address_line1 = addressObj.address_line1;
        if (addressObj.address_line2) metaPayload.address_line2 = addressObj.address_line2;
        if (addressObj.city) metaPayload.city = addressObj.city;
        if (addressObj.state_region) metaPayload.state_region = addressObj.state_region;
        if (addressObj.postal_code) metaPayload.postal_code = addressObj.postal_code;
        if (addressObj.country) metaPayload.country = addressObj.country;
      }
      
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: metaPayload
      });
      
      if (error) {
        console.error("Failed to update user:", error);
      }
    }

    const redirectUrl = new URL('/manage', url.origin);
    redirectUrl.searchParams.set('verified', 'true');
    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
