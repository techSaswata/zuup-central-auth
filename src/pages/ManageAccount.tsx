import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Shield } from "lucide-react";
import { TabMyInfo } from "./ProfileTabs";
import ZuupIDCard from "@/components/ZuupIDCard";
import EmployeeProfileForm from "@/components/EmployeeProfileForm";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ManageAccount() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  
  const meta = user?.user_metadata || {};
  const slackConnected = Boolean(meta.slack_connected);

  const [employee, setEmployee] = useState<any>(null);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      supabase.auth.refreshSession().then(() => {
        toast.success("Aadhaar Data Synced Successfully!");
        // Hard reload to clear the query param and guarantee the new session is loaded from local storage
        window.location.href = '/manage';
      });
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !user?.email) return;

    const fetchEmployee = async () => {
      // Find auth-linked row by email_primary or id
      const { data: byEmail } = await supabase.from("employees").select("*").eq("email_primary", user.email).maybeSingle();
      const linked = byEmail || (await supabase.from("employees").select("*").eq("id", user.id).maybeSingle()).data;

      if (!linked) return;

      // If parent_id exists, the parent is the canonical profile with the real slug
      if (linked.parent_id) {
        const { data: parent } = await supabase.from("employees").select("*").eq("id", linked.parent_id).maybeSingle();
        if (parent) {
          setEmployee(parent);
          setProfileSlug(parent.slug || linked.slug || null);
          return;
        }
      }

      setEmployee(linked);
      setProfileSlug(linked.slug || null);
    };

    fetchEmployee();
  }, [user]);

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#e8eaf0", fontFamily: "'Inter',system-ui,sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        <button 
          onClick={() => navigate("/profile")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", padding: "8px 16px", borderRadius: "12px", cursor: "pointer", marginBottom: "32px", fontSize: "14px", fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "24px" }}>Manage Account</h1>

        {/* Zuup ID Card */}
        {user && (
          <div style={{ marginBottom: "32px", display: "flex", justifyContent: "center" }}>
            <ZuupIDCard user={user} employee={employee} />
          </div>
        )}

        {/* Aadhaar Verification Banner */}
        {!meta.aadhaar_last4 ? (
          <div style={{ 
            marginBottom: "24px", 
            padding: "24px", 
            background: "rgba(255,255,255,0.02)", 
            borderRadius: "16px", 
            border: "1px solid rgba(255,255,255,0.08)", 
            display: "flex", 
            flexDirection: "row",
            justifyContent: "space-between", 
            alignItems: "center",
            gap: "24px"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#e8eaf0" }}>
                  Verify Your Identity
                </h2>
              </div>
              <p style={{ fontSize: "14px", color: "#a1a1aa", lineHeight: "1.5", margin: 0 }}>
                Identity verification via Aadhaar is mandatory for events. We only verify locally—no data is sent to external servers. Only the last 4 digits are securely saved.
              </p>
            </div>
            <button 
              onClick={() => window.location.href = `/api/auth/meripehchaan/login?userId=${user?.id}`}
              style={{ 
                background: "#e8eaf0", 
                color: "#050505", 
                padding: "10px 20px", 
                borderRadius: "100px", 
                border: "none",
                fontSize: "14px", 
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "opacity 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            >
              Verify with MeriPehchaan
            </button>
          </div>
        ) : (
          <div style={{ 
            marginBottom: "24px", 
            padding: "16px 24px", 
            background: "rgba(16, 185, 129, 0.05)", 
            borderRadius: "16px", 
            border: "1px solid rgba(16, 185, 129, 0.2)", 
            display: "flex", 
            flexDirection: "row",
            justifyContent: "space-between", 
            alignItems: "center",
            gap: "24px"
          }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#10b981", display: "flex", alignItems: "center", gap: "8px" }}>
                <Shield size={20} /> Identity Verified
              </h2>
              <p style={{ fontSize: "13px", color: "#a1a1aa", margin: "4px 0 0 0" }}>
                Your identity has been successfully verified via UIDAI.
              </p>
            </div>
            <div style={{
              background: "rgba(16, 185, 129, 0.1)",
              color: "#10b981",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              fontFamily: "monospace"
            }}>
              XXXX XXXX {meta.aadhaar_last4}
            </div>
          </div>
        )}

        <div style={{ marginBottom: "24px", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 15 }}>Slack Integration</p>
            <p style={{ margin: 0, fontSize: 13, color: "#a1a1aa" }}>
              {slackConnected ? "Your account is linked to Slack." : "Link your account to receive notifications."}
            </p>
          </div>
          {slackConnected ? (
            <span style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", padding: "6px 12px", borderRadius: "8px", fontSize: 13, fontWeight: 600 }}>Linked ✓</span>
          ) : (
            <a href={`/api/slack/connect?token=${session?.access_token || ""}`} style={{ background: "#4A154B", color: "white", padding: "8px 16px", borderRadius: "8px", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              Connect Slack
            </a>
          )}
        </div>

        {/* TabMyInfo is automatically pre-filled since it pulls from user?.user_metadata directly inside its component */}
        <TabMyInfo />

        {/* Employee Profile Form */}
        {user && (
          <div style={{ marginTop: "32px" }}>
            <EmployeeProfileForm user={user} employee={employee} onSaved={setEmployee} />
          </div>
        )}

      </div>
    </div>
  );
}
