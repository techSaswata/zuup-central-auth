import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Network() {
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("employees")
      .select("*")
      .order("joined_at", { ascending: false })
      .then(({ data, error }) => {
        if (data) setPeople(data);
        if (error) console.error(error);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#e8eaf0", fontFamily: "'Inter',system-ui,sans-serif", padding: "40px 20px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        
        <button 
          onClick={() => navigate("/profile")}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#a1a1aa", padding: "8px 16px", borderRadius: "12px", cursor: "pointer", marginBottom: "32px", fontSize: "14px", fontWeight: 500 }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <h1 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "8px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Users color="#e8425a" /> Zuup Network
        </h1>
        <p style={{ color: "#a1a1aa", marginBottom: "40px", fontSize: "16px" }}>
          The public directory of builders, makers, and staff at Zuup.
        </p>

        {loading ? (
          <p>Loading the network...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
            {people.map(person => (
              <div key={person.id} style={{ 
                background: "#0a0a0a", 
                border: "1px solid rgba(255,61,127,0.3)", 
                borderRadius: "16px", 
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                transition: "transform 0.2s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <img 
                    src={person.photo_url || "/placeholder.svg"} 
                    alt={person.name} 
                    style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e8425a" }}
                    onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                  />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#fff" }}>{person.name}</h3>
                    <p style={{ margin: 0, fontSize: "14px", color: "#e8425a", fontFamily: "'Caveat', cursive", fontSize: "18px" }}>
                      "{person.tagline || "Builder"}"
                    </p>
                  </div>
                </div>

                <div style={{ fontSize: "13px", color: "#a1a1aa" }}>
                  <div style={{ marginBottom: "4px" }}><strong>Dept:</strong> {person.department}</div>
                  <div style={{ marginBottom: "4px" }}><strong>Chapter:</strong> {person.chapter}</div>
                  {person.skills && person.skills.length > 0 && (
                    <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {person.skills.slice(0, 3).map((s: string) => (
                        <span key={s} style={{ background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: "100px", fontSize: "11px" }}>{s}</span>
                      ))}
                      {person.skills.length > 3 && <span style={{ fontSize: "11px" }}>+{person.skills.length - 3}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
