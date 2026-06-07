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
