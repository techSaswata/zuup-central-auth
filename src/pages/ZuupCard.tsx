import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import { ArrowLeft, Download, ShieldCheck, Loader2 } from "lucide-react";

const PINK = "#FF3D7F";
const DARK = "#050505";
const CAVEAT = "'Caveat', cursive";
const INTER = "'Inter', system-ui, sans-serif";
const MONO = "'Courier New', monospace";

function formatMemberSince(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ── Card ───────────────────────────────────────────────────────────────────────
function ZuupIDCard({ user, slug, employeeRecord }: { user: any; slug: string | null; employeeRecord: any }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [light, setLight] = useState({ x: 50, y: 50, on: false });

  const meta = user?.user_metadata || {};
  const displayName: string = (employeeRecord?.name || meta.full_name || meta.name || user?.email?.split("@")[0] || "Member") as string;
  const avatarUrl: string | undefined = (employeeRecord?.photo_url || meta.avatar_url) as string | undefined;
  const initial = displayName[0]?.toUpperCase() || "Z";

  // Staff: zuup.dev email OR has an employee record with a department
  const isStaff = user?.email?.endsWith("@zuup.dev") || !!employeeRecord?.department || meta.role === "admin";
  const isVerified = !!meta.aadhaar_last4;

  // Work / position
  let workLine: string;
  if (isStaff && employeeRecord?.department) {
    workLine = employeeRecord.department;
  } else if (isVerified) {
    workLine = "Verified Shipper at Zuup";
  } else {
    workLine = "A Shipper at Zuup";
  }

  const accountId = user?.id || "—";
  const memberSince = formatMemberSince(user?.created_at);

  // Only show profile URL if slug exists in the DB
  const profileSlug = slug; // null if not set
  const profileUrl = profileSlug ? `people.zuup.dev/${profileSlug}` : null;
  const fullUrl = profileSlug ? `https://people.zuup.dev/${profileSlug}` : null;
  // barcodeapi.org Code128 — already renders human-readable text below bars natively
  const barcodeUrl = profileUrl ? `https://barcodeapi.org/api/128/${encodeURIComponent(profileUrl)}` : null;

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    setTilt({ x: ((y - r.height / 2) / (r.height / 2)) * -9, y: ((x - r.width / 2) / (r.width / 2)) * 9 });
    setLight({ x: (x / r.width) * 100, y: (y / r.height) * 100, on: true });
  };
  const onMouseLeave = () => { setTilt({ x: 0, y: 0 }); setLight(l => ({ ...l, on: false })); };

  return (
    <div style={{ perspective: "1100px", width: "100%", display: "flex", justifyContent: "center" }}>
      <div
        id="zuup-card-dl"
        ref={cardRef}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{
          width: "100%",
          maxWidth: "540px",
          borderRadius: "22px",
          overflow: "hidden",
          position: "relative",
          transform: `perspective(1100px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${light.on ? 1.025 : 1})`,
          transformStyle: "preserve-3d",
          transition: "transform 0.14s ease-out, box-shadow 0.22s ease-out",
          cursor: "default",
          userSelect: "none",
          background: "linear-gradient(155deg, #0d0d18 0%, #0a0a12 50%, #080810 100%)",
          boxShadow: light.on
            ? `0 0 0 1.5px rgba(255,61,127,0.55), 0 28px 64px -8px rgba(0,0,0,0.95), 0 0 110px -18px rgba(255,61,127,0.7), inset 0 1px 0 rgba(255,255,255,0.08)`
            : `0 0 0 1px rgba(255,61,127,0.22), 0 18px 48px -8px rgba(0,0,0,0.9), 0 0 50px -24px rgba(255,61,127,0.25), inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      >
        {/* Light source bloom */}
        <div data-light-overlay="1" style={{ position: "absolute", inset: 0, zIndex: 55, pointerEvents: "none", transition: "background 0.06s", background: light.on ? `radial-gradient(ellipse 68% 62% at ${light.x}% ${light.y}%, rgba(255,61,127,0.26) 0%, rgba(155,65,255,0.11) 38%, transparent 68%)` : "transparent" }} />
        {/* Specular */}
        <div data-light-overlay="1" style={{ position: "absolute", inset: 0, zIndex: 56, pointerEvents: "none", mixBlendMode: "screen" as const, transition: "background 0.06s", background: light.on ? `radial-gradient(circle 52px at ${light.x}% ${light.y}%, rgba(255,255,255,0.15) 0%, transparent 100%)` : "transparent" }} />

        {/* Ambient corner glows */}
        <div style={{ position: "absolute", top: "-30%", right: "-12%", width: "55%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,61,127,0.07) 0%, transparent 70%)", zIndex: 1, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "25%", left: "-10%", width: "42%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", zIndex: 1, pointerEvents: "none" }} />

        {/* Moza — far right edge */}
        <img src="/moza-card.png" alt="" style={{ position: "absolute", bottom: "12%", right: "-9%", height: "78%", opacity: 0.09, pointerEvents: "none", zIndex: 2, filter: "brightness(4) saturate(0)", mixBlendMode: "screen" as const }} onError={(e) => { e.currentTarget.style.display = "none"; }} />

        {/* ═══ CONTENT ═══ */}
        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column" }}>

          {/* TOP: Logo + tagline | Staff badge (only if staff) */}
          <div style={{ padding: "20px 22px 12px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>

            {/* Logo + tagline */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <img
                src="/zuupw.png"
                alt="Zuup"
                style={{ height: "40px", objectFit: "contain", alignSelf: "flex-start", filter: "brightness(1.1) drop-shadow(0 0 10px rgba(255,61,127,0.6))" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const s = document.createElement("span");
                  s.style.cssText = `font-family:'Caveat',cursive;font-size:32px;font-weight:700;color:#fff;display:block;line-height:1;text-shadow:0 0 12px rgba(255,61,127,0.5)`;
                  s.textContent = "Zuup";
                  e.currentTarget.parentElement?.insertBefore(s, e.currentTarget.nextSibling);
                }}
              />
              {/* Tagline — fully Caveat */}
              <span style={{ fontFamily: CAVEAT, fontSize: "15px", color: "rgba(255,255,255,0.3)", fontWeight: 400, lineHeight: 1.1 }}>
                What if everyone got a{" "}
                <span style={{ color: PINK, fontWeight: 700, position: "relative", display: "inline-block" }}>
                  chance?
                  <svg width="36" height="5" viewBox="0 0 36 5" fill="none" style={{ position: "absolute", bottom: "-3px", left: 0 }}>
                    <path d="M0 2.5L4.5 0L11 5L17.5 0L24 5L30 0L36 2.5" stroke={PINK} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.75"/>
                  </svg>
                </span>
              </span>
            </div>

            {/* Badge — Caveat hand-lettered, no icons */}
            {isStaff ? (
              /* Staff — rotated ink-stamp style */
              <div style={{
                flexShrink: 0, marginTop: "6px",
                border: `2px solid ${PINK}`,
                borderRadius: "6px",
                padding: "3px 10px 2px",
                transform: "rotate(-2deg)",
                boxShadow: `0 0 14px rgba(255,61,127,0.3)`,
                background: "rgba(255,61,127,0.08)",
              }}>
                <span style={{ fontFamily: CAVEAT, fontSize: "16px", fontWeight: 700, color: PINK, letterSpacing: "0.08em", lineHeight: 1 }}>
                  staff
                </span>
              </div>
            ) : (
              /* Member — same stamp style, muted */
              <div style={{
                flexShrink: 0, marginTop: "6px",
                border: "2px solid rgba(255,255,255,0.15)",
                borderRadius: "6px",
                padding: "3px 10px 2px",
                transform: "rotate(-2deg)",
                background: "rgba(255,255,255,0.03)",
              }}>
                <span style={{ fontFamily: CAVEAT, fontSize: "16px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", lineHeight: 1 }}>
                  member
                </span>
              </div>
            )}
          </div>

          {/* BODY: Photo | Info */}
          <div style={{ padding: "4px 22px 18px", display: "flex", gap: "20px", alignItems: "flex-start" }}>

            {/* Portrait photo */}
            <div style={{ flexShrink: 0 }}>
              <div style={{
                width: "90px",
                height: "112px",
                borderRadius: "12px",
                border: `2px solid rgba(255,61,127,0.45)`,
                boxShadow: `0 0 22px rgba(255,61,127,0.18), 0 6px 18px rgba(0,0,0,0.7)`,
                overflow: "hidden",
                background: "linear-gradient(160deg, #111120, #0d0d18)",
                display: "grid",
                placeItems: "center",
                position: "relative",
              }}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const p = e.currentTarget.parentElement;
                      if (p) p.innerHTML = `<span style="font-family:'Caveat',cursive;font-size:44px;font-weight:800;color:${PINK};text-shadow:0 0 20px rgba(255,61,127,0.5)">${initial}</span>`;
                    }}
                  />
                ) : (
                  <span style={{ fontFamily: CAVEAT, fontSize: "44px", fontWeight: 800, color: PINK, textShadow: `0 0 20px rgba(255,61,127,0.5)` }}>{initial}</span>
                )}
                <div style={{ position: "absolute", inset: 0, borderRadius: "10px", boxShadow: "inset 0 0 12px rgba(255,61,127,0.1)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Info column */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", paddingTop: "2px", overflow: "hidden" }}>

              {/* Name */}
              <div>
                <p style={{ margin: 0, fontFamily: CAVEAT, fontSize: "36px", fontWeight: 700, color: "#fff", lineHeight: 0.95, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 2px 16px rgba(0,0,0,0.7)" }}>
                  {displayName}
                </p>
                <svg width="82" height="7" viewBox="0 0 82 7" fill="none" style={{ marginTop: "5px" }}>
                  <path d="M0 3.5L6.5 0L19.5 7L32.5 0L45.5 7L58.5 0L71.5 7L81 0.5" stroke={PINK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
                </svg>
              </div>

              {/* Member Since */}
              <div>
                <p style={{ margin: "0 0 1px", fontFamily: INTER, fontSize: "7px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(255,61,127,0.5)" }}>Member Since</p>
                <p style={{ margin: 0, fontFamily: INTER, fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{memberSince}</p>
              </div>

              {/* Account ID */}
              <div>
                <p style={{ margin: "0 0 1px", fontFamily: INTER, fontSize: "7px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(255,61,127,0.5)" }}>Account ID</p>
                <p style={{ margin: 0, fontFamily: MONO, fontSize: "8.5px", fontWeight: 700, color: PINK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: `0 0 10px rgba(255,61,127,0.4)`, letterSpacing: "0.04em" }}>
                  {accountId}
                </p>
              </div>

              {/* Work */}
              <div>
                <p style={{ margin: "0 0 1px", fontFamily: INTER, fontSize: "7px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(255,61,127,0.5)" }}>Work</p>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  {isVerified && <ShieldCheck size={11} color="#10b981" style={{ flexShrink: 0 }} />}
                  <p style={{ margin: 0, fontFamily: INTER, fontSize: "12px", fontWeight: 600, color: isVerified ? "#10b981" : "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {workLine}
                  </p>
                </div>
              </div>

              {/* Profile URL — only if slug exists */}
              {profileUrl && (
                <div>
                  <p style={{ margin: "0 0 1px", fontFamily: INTER, fontSize: "7px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(255,61,127,0.5)" }}>Profile</p>
                  <p style={{ margin: 0, fontFamily: MONO, fontSize: "8.5px", color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {profileUrl}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* BARCODE STRIP — only if slug exists */}
          {barcodeUrl && (
            <div>
              {/* "scan to view" label in pink above the strip */}
              <div style={{ padding: "0 22px 5px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                <span style={{ fontFamily: CAVEAT, fontSize: "15px", color: PINK, fontWeight: 600, lineHeight: 1, transform: "rotate(-2deg)", display: "inline-block" }}>
                  scan to view
                </span>
                {/* Clearly visible pink curvy arrow */}
                <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
                  <path d="M2 2 C2 2, 9 2, 15 9 C18 13, 19 16, 19 18" stroke={PINK} strokeWidth="1.8" strokeLinecap="round" fill="none"/>
                  <path d="M16.5 15.5 L19.5 19 L22.5 15.5" stroke={PINK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* White barcode strip — barcodeapi already renders the URL text below bars, so NO extra <p> */}
              <div style={{ background: "#ffffff", padding: "10px 20px 10px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <img
                  src={barcodeUrl}
                  alt="Profile Barcode"
                  style={{ height: "52px", width: "100%", objectFit: "fill", display: "block" }}
                />
              </div>
            </div>
          )}

          {/* If no slug: show a prompt to set one */}
          {!barcodeUrl && (
            <div style={{ margin: "0 22px 18px", padding: "10px 14px", background: "rgba(255,61,127,0.05)", border: "1px dashed rgba(255,61,127,0.2)", borderRadius: "10px" }}>
              <p style={{ margin: 0, fontFamily: CAVEAT, fontSize: "14px", color: "rgba(255,61,127,0.5)", textAlign: "center" }}>
                Set your slug in Manage Account → your barcode will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ZuupCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slug, setSlug] = useState<string | null>(null);
  const [employeeRecord, setEmployeeRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const cardCaptureRef = useRef<HTMLDivElement>(null);

  // Download entire card as clean PNG via html2canvas
  const downloadCard = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      // Load html2canvas from CDN once
      if (!(window as any).__html2canvas) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = () => { (window as any).__html2canvas = (window as any).html2canvas; resolve(); };
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const h2c = (window as any).__html2canvas;

      // Target the actual card element (not the wrapper)
      const cardEl = document.getElementById("zuup-card-dl") as HTMLElement | null;
      if (!cardEl) throw new Error("Card element not found");

      // Freeze state — zero transforms, remove box-shadow, hide light overlays
      const prevTransform = cardEl.style.transform;
      const prevTransition = cardEl.style.transition;
      const prevBoxShadow = cardEl.style.boxShadow;
      const prevBorderRadius = cardEl.style.borderRadius;
      const lightOverlays = cardEl.querySelectorAll<HTMLElement>("[data-light-overlay]");

      cardEl.style.transform = "none";
      cardEl.style.transition = "none";
      cardEl.style.boxShadow = "none";
      cardEl.style.borderRadius = "18px";
      lightOverlays.forEach(el => { el.style.background = "transparent"; });

      // Let DOM settle
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const canvas = await h2c(cardEl, {
        useCORS: true,
        allowTaint: true,          // needed for barcodeapi.org
        backgroundColor: null,     // card has its own bg
        scale: 2.5,
        logging: false,
        removeContainer: true,
      });

      // Restore
      cardEl.style.transform = prevTransform;
      cardEl.style.transition = prevTransition;
      cardEl.style.boxShadow = prevBoxShadow;
      cardEl.style.borderRadius = prevBorderRadius;
      lightOverlays.forEach(el => { el.style.background = ""; });

      const link = document.createElement("a");
      link.download = `zuup-card-${slug || "card"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed — please try a screenshot.");
    } finally {
      setDownloading(false);
    }
  }, [downloading, slug]);

  // Add to Google Wallet — calls edge function to sign JWT server-side
  const addToGoogleWallet = useCallback(async () => {
    if (walletLoading) return;
    setWalletLoading(true);
    try {
      // Load html2canvas from CDN once
      if (!(window as any).__html2canvas) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          s.onload = () => { (window as any).__html2canvas = (window as any).html2canvas; resolve(); };
          s.onerror = reject;
          document.head.appendChild(s);
        });
      }
      const h2c = (window as any).__html2canvas;

      // Target the actual card element (not the wrapper)
      const cardEl = document.getElementById("zuup-card-dl") as HTMLElement | null;
      let cardImageBase64: string | null = null;

      if (cardEl) {
        // Freeze state — zero transforms, remove box-shadow, hide light overlays
        const prevTransform = cardEl.style.transform;
        const prevTransition = cardEl.style.transition;
        const prevBoxShadow = cardEl.style.boxShadow;
        const prevBorderRadius = cardEl.style.borderRadius;
        const lightOverlays = cardEl.querySelectorAll<HTMLElement>("[data-light-overlay]");

        cardEl.style.transform = "none";
        cardEl.style.transition = "none";
        cardEl.style.boxShadow = "none";
        cardEl.style.borderRadius = "18px";
        lightOverlays.forEach(el => { el.style.background = "transparent"; });

        // Let DOM settle
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

        const cardCanvas = await h2c(cardEl, {
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          scale: 2,
          logging: false,
          removeContainer: true,
        });

        // Restore
        cardEl.style.transform = prevTransform;
        cardEl.style.transition = prevTransition;
        cardEl.style.boxShadow = prevBoxShadow;
        cardEl.style.borderRadius = prevBorderRadius;
        lightOverlays.forEach(el => { el.style.background = ""; });

        // Create a 1032x336 banner canvas (Google Wallet heroImage must be ~3:1 ratio)
        const bannerCanvas = document.createElement("canvas");
        bannerCanvas.width = 1032;
        bannerCanvas.height = 336;
        const ctx = bannerCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#0c0c14";
          ctx.fillRect(0, 0, 1032, 336);
          const cardHeight = 310;
          const aspectRatio = cardCanvas.width / cardCanvas.height;
          const cardWidth = cardHeight * aspectRatio;
          const x = (1032 - cardWidth) / 2;
          const y = (336 - cardHeight) / 2;
          ctx.drawImage(cardCanvas, x, y, cardWidth, cardHeight);
          // JPEG at 0.75 quality keeps banner well under 400KB
          cardImageBase64 = bannerCanvas.toDataURL("image/jpeg", 0.75);
        }
      }

      const meta = user?.user_metadata || {};
      const isStaff = user?.email?.endsWith("@zuup.dev") || !!employeeRecord?.department || meta.role === "admin";

      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/google-wallet-pass`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            name: employeeRecord?.name || meta.full_name || meta.name || user?.email?.split("@")[0],
            slug,
            department: employeeRecord?.department || null,
            isStaff,
            avatarUrl: employeeRecord?.photo_url || meta.avatar_url || null,
            cardImageBase64,
          }),
        }
      );

      const data = await res.json();

      if (data.error) {
        alert(`Google Wallet: ${data.error}`);
        return;
      }

      console.log("🎴 Wallet heroImage URL:", data.debug_heroImage);
      console.log("📦 Upload debug:", data.debug_upload);
      // Open the Google save link — user taps "Save" in the Google UI
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Google Wallet error:", err);
      alert("Could not connect to wallet service. Try again.");
    } finally {
      setWalletLoading(false);
    }
  }, [walletLoading, user, employeeRecord, slug]);

  useEffect(() => {
    if (!user?.id || !user?.email) return;

    const tryFetch = async () => {
      // Step 1: find the row linked to this auth user (by email_primary or id)
      const { data: authRow } = await supabase
        .from("employees")
        .select("*")
        .eq("email_primary", user.email)
        .maybeSingle();

      const linked = authRow || await supabase
        .from("employees")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()
        .then(r => r.data);

      if (!linked) {
        setSlug(null);
        setLoading(false);
        return;
      }

      // Step 2: if this row has a parent_id, the PARENT is the canonical profile
      // (auto-created rows point to the real profile row via parent_id)
      if (linked.parent_id) {
        const { data: parentRow } = await supabase
          .from("employees")
          .select("*")
          .eq("id", linked.parent_id)
          .maybeSingle();

        if (parentRow) {
          setEmployeeRecord(parentRow);
          setSlug(parentRow.slug || linked.slug || null);
          setLoading(false);
          return;
        }
      }

      // No parent_id — this row IS the canonical profile
      setEmployeeRecord(linked);
      setSlug(linked.slug || null);
      setLoading(false);
    };

    tryFetch();
  }, [user]);

  const profileUrl = slug ? `https://people.zuup.dev/${slug}` : null;
  const barcodeUrl = slug ? `https://barcodeapi.org/api/128/${encodeURIComponent(`people.zuup.dev/${slug}`)}` : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: DARK,
      backgroundImage: `radial-gradient(circle at 50% 0%, rgba(255,61,127,0.07) 0%, transparent 50%), radial-gradient(circle at 90% 90%, rgba(139,92,246,0.04) 0%, transparent 40%)`,
      fontFamily: INTER,
      color: "#e8eaf0",
      padding: "40px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: "8%", left: 0, width: "400px", height: "400px", background: "rgba(255,61,127,0.025)", filter: "blur(130px)", borderRadius: "50%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "5%", right: "5%", width: "500px", height: "500px", background: "rgba(139,92,246,0.025)", filter: "blur(150px)", borderRadius: "50%", pointerEvents: "none" }} />

      <div style={{ maxWidth: "570px", margin: "0 auto", position: "relative", zIndex: 1 }}>

        <button
          onClick={() => navigate("/profile")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#777", padding: "8px 16px", borderRadius: "12px", cursor: "pointer", marginBottom: "28px", fontSize: "14px", fontWeight: 500, fontFamily: INTER, transition: "all 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#777"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontFamily: CAVEAT, fontSize: "52px", fontWeight: 700, margin: "0 0 4px", lineHeight: 1, background: `linear-gradient(120deg, #fff 0%, ${PINK} 55%, #a855f7 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Your Zuup Card
          </h1>
          <p style={{ color: "#2e2e2e", fontSize: "14px", margin: 0 }}>Hover to feel the light. Share it with the world.</p>
        </div>

        {/* Card capture wrapper */}
        <div ref={cardCaptureRef}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontFamily: CAVEAT, fontSize: "24px", color: "#2a2a2a" }}>Loading your card...</div>
            </div>
          ) : user ? (
            <ZuupIDCard user={user} slug={slug} employeeRecord={employeeRecord} />
          ) : null}
        </div>

        {/* Action buttons */}
        {!loading && user && (
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>

            {/* Profile link + Download card */}
            {profileUrl && (
              <div style={{ background: "rgba(255,61,127,0.04)", border: "1px solid rgba(255,61,127,0.12)", borderRadius: "14px", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ overflow: "hidden" }}>
                  <p style={{ margin: "0 0 2px", fontSize: "10px", color: "rgba(255,61,127,0.6)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>Public Profile</p>
                  <a href={profileUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: MONO, fontSize: "13px", color: "#bbb", textDecoration: "none", fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = PINK; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#bbb"; }}
                  >
                    {profileUrl}
                  </a>
                </div>
                {/* Download ENTIRE CARD as PNG */}
                <button
                  onClick={downloadCard}
                  disabled={downloading}
                  title="Download card as image"
                  style={{ flexShrink: 0, width: "38px", height: "38px", borderRadius: "10px", background: "rgba(255,61,127,0.08)", border: "1px solid rgba(255,61,127,0.2)", display: "grid", placeItems: "center", color: PINK, cursor: downloading ? "not-allowed" : "pointer", transition: "background 0.2s" }}
                  onMouseEnter={(e) => { if (!downloading) e.currentTarget.style.background = "rgba(255,61,127,0.18)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,61,127,0.08)"; }}
                >
                  {downloading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Download size={15} />}
                </button>
              </div>
            )}

            {/* Wallet buttons row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>

              {/* Google Wallet */}
              <button
                onClick={addToGoogleWallet}
                disabled={walletLoading}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: "#fff", border: "none", borderRadius: "12px", padding: "12px 16px", cursor: walletLoading ? "not-allowed" : "pointer", transition: "opacity 0.2s", boxShadow: "0 2px 12px rgba(0,0,0,0.4)", opacity: walletLoading ? 0.7 : 1 }}
                onMouseEnter={(e) => { if (!walletLoading) e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={(e) => { if (!walletLoading) e.currentTarget.style.opacity = "1"; }}
              >
                {walletLoading ? (
                  <Loader2 size={18} style={{ animation: "spin 1s linear infinite", color: "#1a73e8" }} />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                    <path d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" fill="#FFC107"/>
                    <path d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z" fill="#FF3D00"/>
                    <path d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8H6.4C9.8 38.8 16.4 44 24 44z" fill="#4CAF50"/>
                    <path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.4l6.2 5.2C37 36.3 44 31 44 24c0-1.2-.1-2.3-.4-3.5z" fill="#1976D2"/>
                  </svg>
                )}
                <span style={{ fontFamily: INTER, fontSize: "13px", fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap" }}>
                  {walletLoading ? "Generating..." : "Add to Google Wallet"}
                </span>
              </button>

              {/* Apple Wallet */}
              <button
                onClick={() => alert("Apple Wallet passes are coming soon! For now, download your card image.")}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: "#000", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "12px 16px", cursor: "pointer", transition: "opacity 0.2s", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {/* Apple logo */}
                <svg width="18" height="20" viewBox="0 0 814 1000" fill="#fff">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-167.2-113.4C32 373 32 248.8 32 248.8S-0.3 216 0 176.7c.3-19.5 16.9-34.9 36.4-34.9 12 0 23 5 32 15 46 50.3 86.4 68.1 130.2 68.1 37.4 0 76.6-16.3 116.8-48.7 59.4-47.9 119.1-73.3 184.7-73.3 99.5 0 178.5 63.4 178.5 159.3 0 56.8-28.8 115.8-71.6 158.4l-.1-.7z"/>
                </svg>
                <span style={{ fontFamily: INTER, fontSize: "13px", fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>Add to Apple Wallet</span>
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: "22px", fontFamily: CAVEAT, fontSize: "15px", color: "#1e1e1e" }}>
          Made with ❤️ by Moza &amp; the Zuup team
        </p>
      </div>
    </div>
  );
}

// spin keyframe injected globally once
const _spin = document.createElement("style");
_spin.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
if (!document.getElementById("zuup-spin")) { _spin.id = "zuup-spin"; document.head.appendChild(_spin); }
