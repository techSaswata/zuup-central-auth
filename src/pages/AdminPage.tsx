import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AdminPanel from "./AdminPanel";

export default function AdminPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#e8eaf0", fontFamily: "'Inter',system-ui,sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        
        <button 
          onClick={() => navigate("/profile")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", padding: "8px 16px", borderRadius: "12px", cursor: "pointer", marginBottom: "32px", fontSize: "14px", fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "8px" }}>Supabase Admin Console</h1>
        <p style={{ color: "#a1a1aa", marginBottom: "24px" }}>Manage all user profiles, track sign-ins, and explore metadata.</p>

        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "24px" }}>
          <AdminPanel />
        </div>

      </div>
    </div>
  );
}
