import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { logAuditEvent, generateSecureRandom } from "@/lib/oauth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, Check, RefreshCw, Globe, Mail } from "lucide-react";

const COUNTRY_LIST = ["United States","India","United Kingdom","Canada","Australia","Germany","France","Singapore","United Arab Emirates","Japan","Netherlands","Brazil","South Africa","Mexico","Other"];
const MOBILE_CODES = ["+1 (US/CA)","+44 (UK)","+61 (AU)","+49 (DE)","+33 (FR)","+91 (IN)","+81 (JP)","+65 (SG)","+971 (UAE)","+52 (MX)","+55 (BR)","+27 (ZA)"];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(320 / img.width, 320 / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function TabMyInfo() {
  const { user, updateProfile, updateEmail } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = user?.user_metadata || {};

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(meta.full_name || meta.name || "");
  const [lastName, setLastName] = useState(meta.last_name || "");
  const [country, setCountry] = useState(meta.country || "");
  const [phoneCode, setPhoneCode] = useState(meta.phone_country_code || "+91 (IN)");
  const [phone, setPhone] = useState(meta.phone || "");
  const [addr1, setAddr1] = useState(meta.address_line1 || meta.mailing_address?.line1 || "");
  const [addr2, setAddr2] = useState(meta.address_line2 || meta.mailing_address?.line2 || "");
  const [city, setCity] = useState(meta.city || meta.mailing_address?.city || "");
  const [state, setState] = useState(meta.state_region || meta.mailing_address?.state_region || "");
  const [postal, setPostal] = useState(meta.postal_code || meta.mailing_address?.postal_code || "");
  const [username, setUsername] = useState(meta.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [avatar, setAvatar] = useState(meta.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const displayName = fullName || meta.full_name || user?.email?.split("@")[0] || "User";
  const initial = displayName[0]?.toUpperCase() || "U";

  useEffect(() => {
    if (user?.user_metadata) {
      const m = user.user_metadata;
      if (m.full_name || m.name) setFullName(m.full_name || m.name);
      if (m.last_name) setLastName(m.last_name);
      if (m.country) setCountry(m.country);
      if (m.phone_country_code) setPhoneCode(m.phone_country_code);
      if (m.phone) setPhone(m.phone);
      if (m.address_line1 || m.mailing_address?.line1) setAddr1(m.address_line1 || m.mailing_address?.line1 || "");
      if (m.address_line2 || m.mailing_address?.line2) setAddr2(m.address_line2 || m.mailing_address?.line2 || "");
      if (m.city || m.mailing_address?.city) setCity(m.city || m.mailing_address?.city || "");
      if (m.state_region || m.mailing_address?.state_region) setState(m.state_region || m.mailing_address?.state_region || "");
      if (m.postal_code || m.mailing_address?.postal_code) setPostal(m.postal_code || m.mailing_address?.postal_code || "");
      if (m.username) setUsername(m.username);
      if (m.avatar_url) setAvatar(m.avatar_url);
    }
  }, [user?.user_metadata]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    setUploading(true);
    try {
      const url = await fileToDataUrl(file);
      await updateProfile({ avatar_url: url });
      setAvatar(url);
      toast.success("Avatar updated");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        full_name: fullName.trim(), first_name: fullName.trim(), last_name: lastName.trim(),
        name: `${fullName} ${lastName}`.trim(), country, phone, phone_country_code: phoneCode,
        full_phone: phone ? `${phoneCode} ${phone}` : "",
        address_line1: addr1, address_line2: addr2, city, state_region: state, postal_code: postal,
        username, avatar_url: avatar,
        mailing_address: { line1: addr1, line2: addr2, city, state_region: state, postal_code: postal, country },
      });
      if (email !== user?.email) {
        await updateEmail(email);
        logAuditEvent({ type: "email_changed", user_id: user?.id });
        toast.success(`Confirmation sent to ${email}`);
      } else {
        toast.success("Profile saved");
      }
      setIsEditing(false);
    } catch (err: any) { toast.error(err.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const inp = "w-full h-10 rounded-lg px-3 text-sm outline-none transition-colors";
  const inpStyle: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8eaf0" };
  const sel = { ...inpStyle, width: "100%", height: 40, borderRadius: 8, padding: "0 10px" };

  const DataItem = ({ label, value }: { label: string, value: string }) => (
    <div>
      <Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 4, display: "block" }}>{label}</Label>
      <p style={{ margin: 0, fontSize: 14, color: "#f1f3f8", minHeight: 20 }}>{value || "—"}</p>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Profile Settings</p>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8eaf0" }}>
            Edit Profile
          </Button>
        ) : (
          <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm" style={{ color: "#9ca3af" }}>
            Cancel
          </Button>
        )}
      </div>

      {/* Avatar row */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
        <p style={{ margin: "0 0 16px", fontWeight: 600, fontSize: 16 }}>Profile photo & name</p>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ position: "relative" }}>
            {avatar
              ? <img src={avatar} alt={displayName} style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }} />
              : <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#e8425a,#f06080)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 28 }}>{initial}</div>
            }
            {isEditing && (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                style={{ position: "absolute", right: -4, bottom: -4, width: 28, height: 28, borderRadius: "50%", border: "2px solid #0d0f14", background: "#e8425a", color: "white", display: "grid", placeItems: "center", cursor: "pointer" }}>
                {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Camera size={12} />}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display: "none" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 600 }}>{displayName} {lastName}</p>
            <p style={{ margin: "0 0 8px", color: "#6b7280", fontSize: 12 }}>{user?.email}</p>
            {isEditing && <p style={{ margin: 0, fontSize: 11, color: "#4b5563" }}>JPG or PNG · max 2MB</p>}
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
        <p style={{ margin: "0 0 16px", fontWeight: 600, fontSize: 16 }}>Personal info</p>
        {!isEditing ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <DataItem label="First name" value={fullName} />
              <DataItem label="Last name" value={lastName} />
            </div>
            <DataItem label="Username" value={username} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <DataItem label="Email" value={email} />
              <DataItem label="Country" value={country} />
            </div>
            <DataItem label="Phone number" value={phone ? `${phoneCode} ${phone}` : ""} />
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>First name</Label>
                <input className={inp} style={inpStyle} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="First name" /></div>
              <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>Last name</Label>
                <input className={inp} style={inpStyle} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" /></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>Username</Label>
              <input className={inp} style={inpStyle} value={username} onChange={e => setUsername(e.target.value)} placeholder="your-handle" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>Email</Label>
                <div style={{ position: "relative" }}>
                  <Mail size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                  <input className={inp} style={{ ...inpStyle, paddingLeft: 30 }} type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                {email !== user?.email && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#e8425a" }}>Confirmation will be sent</p>}
              </div>
              <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>Country</Label>
                <select value={country} onChange={e => setCountry(e.target.value)} style={{ ...sel } as React.CSSProperties}>
                  <option value="">Select country</option>
                  {COUNTRY_LIST.map(c => <option key={c} value={c} style={{ color: "#111" }}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, marginTop: 12 }}>
              <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>Code</Label>
                <select value={phoneCode} onChange={e => setPhoneCode(e.target.value)} style={{ ...sel } as React.CSSProperties}>
                  {MOBILE_CODES.map(c => <option key={c} value={c} style={{ color: "#111" }}>{c}</option>)}
                </select>
              </div>
              <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>Phone number</Label>
                <input className={inp} style={inpStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Address */}
      <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 24 }}>
        <p style={{ margin: "0 0 16px", fontWeight: 600, fontSize: 16 }}>Mailing address</p>
        {!isEditing ? (
          <div style={{ display: "grid", gap: 16 }}>
            <DataItem label="Address line 1" value={addr1} />
            {addr2 && <DataItem label="Address line 2" value={addr2} />}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <DataItem label="City" value={city} />
              <DataItem label="State / region" value={state} />
              <DataItem label="Postal code" value={postal} />
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>Address line 1</Label>
              <input className={inp} style={inpStyle} value={addr1} onChange={e => setAddr1(e.target.value)} placeholder="Street and number" /></div>
            <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>Address line 2 (optional)</Label>
              <input className={inp} style={inpStyle} value={addr2} onChange={e => setAddr2(e.target.value)} placeholder="Apartment, suite, landmark" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>City</Label>
                <input className={inp} style={inpStyle} value={city} onChange={e => setCity(e.target.value)} placeholder="City" /></div>
              <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>State / region</Label>
                <input className={inp} style={inpStyle} value={state} onChange={e => setState(e.target.value)} placeholder="State" /></div>
              <div><Label style={{ fontSize: 11, color: "#6b7280", marginBottom: 6, display: "block" }}>Postal code</Label>
                <input className={inp} style={inpStyle} value={postal} onChange={e => setPostal(e.target.value)} placeholder="ZIP / PIN" /></div>
            </div>
          </div>
        )}
      </div>

      {isEditing && (
        <Button onClick={handleSave} disabled={saving} style={{ background: "linear-gradient(135deg,#e8425a,#f06080)", border: "none", color: "white", fontWeight: 600, height: 42, borderRadius: 10, cursor: "pointer" }}>
          {saving ? <><RefreshCw size={14} className="animate-spin" style={{ marginRight: 6 }} />Saving…</> : <><Check size={14} style={{ marginRight: 6 }} />Save all changes</>}
        </Button>
      )}
    </div>
  );
}

export function TabPrograms() {
  const programs = [
    {
      name: "FAR AWAY Hackathon",
      tagline: "Build the future. Win big.",
      status: "open",
      statusColor: "#10b981",
      description: "India's most ambitious youth hackathon. 48-hour sprint to solve real-world problems with tech, creativity, and hustle.",
      url: "https://faraway.zuup.dev",
      badge: "Applications Open",
      badgeBg: "rgba(16,185,129,0.15)",
      gradient: "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
    },
    {
      name: "Zuup Cohort",
      tagline: "3-month intensive program",
      status: "enrolling",
      statusColor: "#f59e0b",
      description: "Join a cohort of builders, designers, and founders. Mentorship, projects, and a community that pushes you forward.",
      url: "https://zuup.dev/cohort",
      badge: "Enrolling Now",
      badgeBg: "rgba(245,158,11,0.15)",
      gradient: "linear-gradient(135deg, #1a0533, #2d0f52, #1a0533)",
    },
    {
      name: "Zuup Schools",
      tagline: "Tech education for the next billion",
      status: "active",
      statusColor: "#818cf8",
      description: "Partner schools program bringing Zuup tools, curriculum, and community to students across India.",
      url: "https://zuup.dev/schools",
      badge: "Active",
      badgeBg: "rgba(129,140,248,0.15)",
      gradient: "linear-gradient(135deg, #0f172a, #1e1b4b, #0f172a)",
    },
    {
      name: "Zuup Buy",
      tagline: "Merch & gear for builders",
      status: "live",
      statusColor: "#e8425a",
      description: "Official Zuup merchandise. Represent the ecosystem with limited drops, hoodies, and builder kits.",
      url: "https://order.zuup.dev",
      badge: "Shop Live",
      badgeBg: "rgba(232,66,90,0.15)",
      gradient: "linear-gradient(135deg, #1a0a0e, #2d1018, #1a0a0e)",
    },
    {
      name: "ZuupCode",
      tagline: "Collaborative coding platform",
      status: "beta",
      statusColor: "#38bdf8",
      description: "Write, share, and run code with your team. Zuup's native dev environment for hackathons and courses.",
      url: "https://code.zuup.dev",
      badge: "Beta",
      badgeBg: "rgba(56,189,248,0.15)",
      gradient: "linear-gradient(135deg, #0c1a2e, #0f2d4a, #0c1a2e)",
    },
    {
      name: "ZuupWatch",
      tagline: "Video learning hub",
      status: "live",
      statusColor: "#e8425a",
      description: "Sessions, workshops, and recorded content from Zuup events and programs. Learn from the best.",
      url: "https://watch.zuup.dev",
      badge: "Live",
      badgeBg: "rgba(232,66,90,0.15)",
      gradient: "linear-gradient(135deg, #1a0a00, #2d1800, #1a0a00)",
    },
  ];

  return (
    <div>
      <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>Zuup Programs</p>
      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: 13 }}>Explore everything Zuup has to offer — programs, products, and communities.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {programs.map(p => (
          <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
            style={{ textDecoration: "none", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", transition: "transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.4)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
          >
            <div style={{ background: p.gradient, padding: "28px 24px 20px", position: "relative" }}>
              <span style={{ background: p.badgeBg, color: p.statusColor, fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, border: `1px solid ${p.statusColor}33` }}>
                {p.badge}
              </span>
              <p style={{ margin: "14px 0 4px", fontSize: 17, fontWeight: 700, color: "#f1f3f8" }}>{p.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>{p.tagline}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.025)", padding: "16px 24px 20px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", lineHeight: 1.6 }}>{p.description}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: p.statusColor, fontSize: 12, fontWeight: 600, marginTop: "auto" }}>
                <Globe size={13} /> Explore →
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
