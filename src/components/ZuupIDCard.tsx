import React, { useRef, useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

const PINK = "#FF3D7F";
const CAVEAT = "'Caveat', cursive";
const INTER = "'Inter', system-ui, sans-serif";
const MONO = "'Courier New', monospace";

function formatMemberSince(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

interface ZuupIDCardProps {
  user: User;
  employee?: any; // pre-fetched employee record (optional — will self-fetch if not provided)
}

export default function ZuupIDCard({ user, employee: propEmployee }: ZuupIDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [light, setLight] = useState({ x: 50, y: 50, on: false });
  const [employeeRecord, setEmployeeRecord] = useState<any>(propEmployee || null);
  const [slug, setSlug] = useState<string | null>(null);

  // Self-fetch employee record + slug if not provided via props
  useEffect(() => {
    if (!user?.id || !user?.email) return;
    if (propEmployee) {
      // Use provided record but still resolve slug via parent_id
      resolveSlug(propEmployee);
      return;
    }

    const fetch = async () => {
      const { data: byEmail } = await supabase.from("employees").select("*").eq("email_primary", user.email).maybeSingle();
      const linked = byEmail || (await supabase.from("employees").select("*").eq("id", user.id).maybeSingle()).data;
      if (!linked) return;
      await resolveSlug(linked);
    };
    fetch();
  }, [user, propEmployee]);

  const resolveSlug = async (linked: any) => {
    if (linked.parent_id) {
      const { data: parent } = await supabase.from("employees").select("*").eq("id", linked.parent_id).maybeSingle();
      if (parent) {
        setEmployeeRecord(parent);
        setSlug(parent.slug || linked.slug || null);
        return;
      }
    }
    setEmployeeRecord(linked);
    setSlug(linked.slug || null);
  };

  const meta = user?.user_metadata || {};
  const displayName: string = (employeeRecord?.name || meta.full_name || meta.name || user?.email?.split("@")[0] || "Member") as string;
  const avatarUrl: string | undefined = (employeeRecord?.photo_url || meta.avatar_url) as string | undefined;
  const initial = displayName[0]?.toUpperCase() || "Z";

  const isStaff = user?.email?.endsWith("@zuup.dev") || !!employeeRecord?.department || meta.role === "admin";
  const isVerified = !!meta.aadhaar_last4;

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
  const profileUrl = slug ? `people.zuup.dev/${slug}` : null;
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
        {/* Light source */}
        <div style={{ position: "absolute", inset: 0, zIndex: 55, pointerEvents: "none", transition: "background 0.06s", background: light.on ? `radial-gradient(ellipse 68% 62% at ${light.x}% ${light.y}%, rgba(255,61,127,0.26) 0%, rgba(155,65,255,0.11) 38%, transparent 68%)` : "transparent" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 56, pointerEvents: "none", mixBlendMode: "screen" as const, transition: "background 0.06s", background: light.on ? `radial-gradient(circle 52px at ${light.x}% ${light.y}%, rgba(255,255,255,0.15) 0%, transparent 100%)` : "transparent" }} />

        {/* Ambient blobs */}
        <div style={{ position: "absolute", top: "-30%", right: "-12%", width: "55%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,61,127,0.07) 0%, transparent 70%)", zIndex: 1, pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "25%", left: "-10%", width: "42%", aspectRatio: "1", borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", zIndex: 1, pointerEvents: "none" }} />

        {/* Moza */}
        <img src="/moza-card.png" alt="" style={{ position: "absolute", bottom: "12%", right: "-9%", height: "78%", opacity: 0.09, pointerEvents: "none", zIndex: 2, filter: "brightness(4) saturate(0)", mixBlendMode: "screen" as const }} onError={(e) => { e.currentTarget.style.display = "none"; }} />

        <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column" }}>

          {/* TOP */}
          <div style={{ padding: "20px 22px 12px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <img src="/zuupw.png" alt="Zuup" style={{ height: "40px", objectFit: "contain", alignSelf: "flex-start", filter: "brightness(1.1) drop-shadow(0 0 10px rgba(255,61,127,0.6))" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const s = document.createElement("span");
                  s.style.cssText = `font-family:'Caveat',cursive;font-size:32px;font-weight:700;color:#fff;display:block;line-height:1`;
                  s.textContent = "Zuup";
                  e.currentTarget.parentElement?.insertBefore(s, e.currentTarget.nextSibling);
                }}
              />
              <span style={{ fontFamily: CAVEAT, fontSize: "15px", color: "rgba(255,255,255,0.3)", fontWeight: 400, lineHeight: 1.1 }}>
                What if everyone got a{" "}
                <span style={{ color: PINK, fontWeight: 700, position: "relative", display: "inline-block" }}>
                  chance?
                  <svg width="36" height="5" viewBox="0 0 36 5" fill="none" style={{ position: "absolute", bottom: "-3px", left: 0 }}>
                    <path d="M0 2.5L4.5 0L11 5L17.5 0L24 5L30 0L36 2.5" stroke={PINK} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
                  </svg>
                </span>
              </span>
            </div>

            {/* Ink-stamp badge */}
            {isStaff ? (
              <div style={{ flexShrink: 0, marginTop: "6px", border: `2px solid ${PINK}`, borderRadius: "6px", padding: "3px 10px 2px", transform: "rotate(-2deg)", boxShadow: `0 0 14px rgba(255,61,127,0.3)`, background: "rgba(255,61,127,0.08)" }}>
                <span style={{ fontFamily: CAVEAT, fontSize: "16px", fontWeight: 700, color: PINK, letterSpacing: "0.08em", lineHeight: 1 }}>staff</span>
              </div>
            ) : (
              <div style={{ flexShrink: 0, marginTop: "6px", border: "2px solid rgba(255,255,255,0.15)", borderRadius: "6px", padding: "3px 10px 2px", transform: "rotate(-2deg)", background: "rgba(255,255,255,0.03)" }}>
                <span style={{ fontFamily: CAVEAT, fontSize: "16px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", lineHeight: 1 }}>member</span>
              </div>
            )}
          </div>

          {/* BODY */}
          <div style={{ padding: "4px 22px 18px", display: "flex", gap: "20px", alignItems: "flex-start" }}>
            {/* Photo */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: "90px", height: "112px", borderRadius: "12px", border: `2px solid rgba(255,61,127,0.45)`, boxShadow: `0 0 22px rgba(255,61,127,0.18), 0 6px 18px rgba(0,0,0,0.7)`, overflow: "hidden", background: "linear-gradient(160deg, #111120, #0d0d18)", display: "grid", placeItems: "center", position: "relative" }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
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

            {/* Info */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", paddingTop: "2px", overflow: "hidden" }}>
              <div>
                <p style={{ margin: 0, fontFamily: CAVEAT, fontSize: "36px", fontWeight: 700, color: "#fff", lineHeight: 0.95, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 2px 16px rgba(0,0,0,0.7)" }}>{displayName}</p>
                <svg width="82" height="7" viewBox="0 0 82 7" fill="none" style={{ marginTop: "5px" }}>
                  <path d="M0 3.5L6.5 0L19.5 7L32.5 0L45.5 7L58.5 0L71.5 7L81 0.5" stroke={PINK} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                </svg>
              </div>
              <div>
                <p style={{ margin: "0 0 1px", fontFamily: INTER, fontSize: "7px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(255,61,127,0.5)" }}>Member Since</p>
                <p style={{ margin: 0, fontFamily: INTER, fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>{memberSince}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 1px", fontFamily: INTER, fontSize: "7px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(255,61,127,0.5)" }}>Account ID</p>
                <p style={{ margin: 0, fontFamily: MONO, fontSize: "8.5px", fontWeight: 700, color: PINK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>{accountId}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 1px", fontFamily: INTER, fontSize: "7px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(255,61,127,0.5)" }}>Work</p>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  {isVerified && <ShieldCheck size={11} color="#10b981" style={{ flexShrink: 0 }} />}
                  <p style={{ margin: 0, fontFamily: INTER, fontSize: "12px", fontWeight: 600, color: isVerified ? "#10b981" : "rgba(255,255,255,0.72)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workLine}</p>
                </div>
              </div>
              {profileUrl && (
                <div>
                  <p style={{ margin: "0 0 1px", fontFamily: INTER, fontSize: "7px", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.15em", color: "rgba(255,61,127,0.5)" }}>Profile</p>
                  <p style={{ margin: 0, fontFamily: MONO, fontSize: "8.5px", color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileUrl}</p>
                </div>
              )}
            </div>
          </div>

          {/* BARCODE STRIP */}
          {barcodeUrl && (
            <div>
              <div style={{ padding: "0 22px 5px", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                <span style={{ fontFamily: CAVEAT, fontSize: "15px", color: PINK, fontWeight: 600, lineHeight: 1, transform: "rotate(-2deg)", display: "inline-block" }}>scan to view</span>
                <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
                  <path d="M2 2 C2 2, 9 2, 15 9 C18 13, 19 16, 19 18" stroke={PINK} strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <path d="M16.5 15.5 L19.5 19 L22.5 15.5" stroke={PINK} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ background: "#ffffff", padding: "10px 20px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <img src={barcodeUrl} alt="Profile Barcode" style={{ height: "52px", width: "100%", objectFit: "fill", display: "block" }} />
              </div>
            </div>
          )}

          {!barcodeUrl && (
            <div style={{ margin: "0 22px 18px", padding: "10px 14px", background: "rgba(255,61,127,0.05)", border: "1px dashed rgba(255,61,127,0.2)", borderRadius: "10px" }}>
              <p style={{ margin: 0, fontFamily: CAVEAT, fontSize: "13px", color: "rgba(255,61,127,0.45)", textAlign: "center" }}>Set your slug in profile settings to activate your barcode</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
