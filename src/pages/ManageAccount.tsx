import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";
import { TabMyInfo } from "./ProfileTabs";

export default function ManageAccount() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  
  const meta = user?.user_metadata || {};
  const slackConnected = Boolean(meta.slack_connected);

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

        {/* Aadhaar Verification Banner */}
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
          <div style={{ flex: 1, fontFamily: "'Kalam', 'Comic Sans MS', cursive" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px", color: "#f8f9fa" }}>
              Verify Your Identity
            </h2>
            <p style={{ fontSize: "14px", color: "#d1d5db", lineHeight: "1.5", margin: 0 }}>
              To participate in Zuup events in India, identity verification via Aadhaar is mandatory. Rest assured, we prioritize your privacy—we only cross-check your data locally using UIDAI certificates. We do not store your full Aadhaar data on our servers; only the last 4 digits are securely saved. No sensitive information leaves your device during this process.
            </p>
          </div>
          <button 
            onClick={() => navigate("/verify-identity")}
            style={{ 
              background: "#ef4444", 
              color: "white", 
              padding: "16px 24px", 
              borderRadius: "999px", 
              border: "none",
              fontSize: "15px", 
              fontWeight: "bold",
              fontFamily: "'Kalam', 'Comic Sans MS', cursive",
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 14px 0 rgba(239, 68, 68, 0.39)",
              transition: "transform 0.1s"
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.95)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            Scan your Aadhaar now
          </button>
        </div>

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

      </div>
    </div>
  );
}
