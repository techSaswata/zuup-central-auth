import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── RSA-RS256 JWT signer using Web Crypto ───────────────────────────────────
async function importPKCS8(pem: string): Promise<CryptoKey> {
  // Extract only the base64 characters, stripping headers, footers, newlines, and backslashes
  const cleanPem = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "");
  const b64 = cleanPem.replace(/[^A-Za-z0-9+/=]/g, "");
  const der = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

function b64url(input: string | Uint8Array): string {
  const str = typeof input === "string" ? input : String.fromCharCode(...input);
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function signRS256(payload: unknown, privateKey: CryptoKey): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const signingInput = `${header}.${body}`;
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(signingInput)
  );
  return `${signingInput}.${b64url(new Uint8Array(sig))}`;
}

// Helper to get OAuth2 Access Token for Google Wallet API
async function getAccessToken(saEmail: string, privateKeyPem: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const payload = {
    iss: saEmail,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    exp,
    iat,
  };
  const cleanPem = privateKeyPem.replace(/\\n/g, "\n");
  const privateKey = await importPKCS8(cleanPem);
  const jwt = await signRS256(payload, privateKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Google OAuth: ${data.error_description || data.error}`);
  }
  return data.access_token;
}

// Helper to ensure the class exists on Google Wallet servers
async function ensureClassExists(classId: string, accessToken: string) {
  const res = await fetch("https://walletobjects.googleapis.com/walletobjects/v1/genericClass", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      id: classId,
      multipleDevicesAndHoldersAllowedStatus: "MULTIPLE_HOLDERS",
      hexBackgroundColor: "#0c0c14",
      logo: {
        sourceUri: { uri: "https://zuup.dev/images/zuup-logo.png" },
        contentDescription: { defaultValue: { language: "en-US", value: "Zuup" } },
      },
      cardTitle: {
        defaultValue: { language: "en-US", value: "Zuup" }
      },
      heroImage: {
        sourceUri: { uri: "https://zuup.dev/images/moza-zuup.png" },
        contentDescription: { defaultValue: { language: "en-US", value: "Zuup Mascot" } }
      }
    }),
  });

  const status = res.status;
  if (status === 409 || status === 200 || status === 201) {
    return;
  }
  const errBody = await res.text();
  throw new Error(`Google API Class Creation Failed (${status}): ${errBody}`);
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Helper to upload base64 card image to Supabase Storage
async function uploadCardImage(userId: string, imageBase64: string): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  // Clean base64 string
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  
  // Convert base64 to binary
  const binaryString = atob(cleanBase64);
  const binaryLen = binaryString.length;
  const binaryData = new Uint8Array(binaryLen);
  for (let i = 0; i < binaryLen; i++) {
    binaryData[i] = binaryString.charCodeAt(i);
  }
  
  // Detect content type from data URI prefix
  const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const ext = mimeType === "image/png" ? "png" : "jpg";

  const bucketName = "wallet-cards";
  const fileName = `${userId}_card.${ext}`;
  
  // Create bucket if it doesn't exist (ignore error if it does)
  await supabase.storage.createBucket(bucketName, { public: true });
  
  // Upload file
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, binaryData, {
      contentType: mimeType,
      upsert: true,
    });
    
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  
  const { data: publicData } = supabase.storage.from(bucketName).getPublicUrl(fileName);
  return publicData.publicUrl;
}

// ── Handler ──────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const issuerId     = Deno.env.get("GOOGLE_WALLET_ISSUER_ID");
    const saEmail      = Deno.env.get("GOOGLE_WALLET_SA_EMAIL");
    const privateKeyPem = Deno.env.get("GOOGLE_WALLET_PRIVATE_KEY");

    if (!issuerId || !saEmail || !privateKeyPem) {
      return new Response(
        JSON.stringify({ error: "Google Wallet credentials not configured. Set GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SA_EMAIL and GOOGLE_WALLET_PRIVATE_KEY in Supabase Edge Function secrets." }),
        { status: 503, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const { name, slug, department, isStaff, avatarUrl, cardImageBase64 } = await req.json();

    const classId  = `${issuerId}.zuup_id_card_v2`;
    const objectId = `${issuerId}.zuup_${(slug || "member").replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    const profileUrl = slug ? `https://people.zuup.dev/${slug}` : "https://people.zuup.dev";
    const workText  = department || (isStaff ? "Staff at Zuup" : "A Shipper at Zuup");

    // Get OAuth token and insert class if not already there
    const token = await getAccessToken(saEmail, privateKeyPem);
    await ensureClassExists(classId, token);

    let heroImageUrl = "https://zuup.dev/images/moza-zuup.png";
    let debugUploadError = "no_base64_received";
    if (cardImageBase64 && cardImageBase64.length > 100) {
      debugUploadError = `base64_len=${cardImageBase64.length}`;
      try {
        const userId = (slug || "member").replace(/[^a-zA-Z0-9_-]/g, "_");
        heroImageUrl = await uploadCardImage(userId, cardImageBase64);
        debugUploadError = "upload_ok";
      } catch (uploadErr) {
        debugUploadError = `upload_failed: ${uploadErr instanceof Error ? uploadErr.message : String(uploadErr)}`;
        console.error("Failed to upload card image:", uploadErr);
      }
    }
    if (heroImageUrl === "https://zuup.dev/images/moza-zuup.png" && avatarUrl && avatarUrl.startsWith("https://") && !avatarUrl.includes("localhost")) {
      heroImageUrl = avatarUrl;
    }

    const genericObject: Record<string, unknown> = {
      id: objectId,
      classId,
      genericType: "GENERIC_TYPE_UNSPECIFIED",
      hexBackgroundColor: "#0c0c14",
      logo: {
        sourceUri: { uri: "https://zuup.dev/images/zuup-logo.png" },
        contentDescription: { defaultValue: { language: "en-US", value: "Zuup" } },
      },
      cardTitle:  { defaultValue: { language: "en-US", value: "Zuup" } },
      subheader:  { defaultValue: { language: "en-US", value: isStaff ? "Staff" : "Member" } },
      header:     { defaultValue: { language: "en-US", value: name || "Zuup Member" } },
      heroImage: {
        sourceUri: { uri: heroImageUrl },
        contentDescription: { defaultValue: { language: "en-US", value: name || "Zuup ID Card" } },
      },
      textModulesData: [
        { id: "work",    header: "WORK",    body: workText },
        { id: "profile", header: "PROFILE", body: profileUrl },
      ],
      linksModuleData: {
        uris: [{ uri: profileUrl, description: "View Profile", id: "profile_link" }],
      },
      barcode: {
        type: "QR_CODE",
        value: profileUrl,
        alternateText: slug ? `@${slug}` : "people.zuup.dev",
      },
      state: "ACTIVE",
    };

    const jwtPayload = {
      iss: saEmail,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      payload: {
        genericObjects: [genericObject],
      },
    };

    const cleanPem = privateKeyPem.replace(/\\n/g, "\n");
    const privateKey = await importPKCS8(cleanPem);
    const jwt = await signRS256(jwtPayload, privateKey);
    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`;

    return new Response(JSON.stringify({ url: saveUrl, debug_heroImage: heroImageUrl, debug_upload: debugUploadError }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
