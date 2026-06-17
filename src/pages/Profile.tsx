import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { getAuditLog, logAuditEvent, getRegisteredClients, type AuditEvent } from "@/lib/oauth";
import { supabase } from "@/lib/supabase";
import { Search, Grid3x3, LogOut, Settings, Users, Shield, Clock, Plus, Cpu, Sparkles, Lightbulb, Activity, Database, Server, Globe, Calendar, ArrowRight, MapPin, Video, Palette, Triangle, HeartHandshake, Award, Mail, AlertCircle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_EMAILS = ["jagrit@zuup.dev", "admin@zuup.dev"];

const ZUUP_APPS = [
  { name: "Zuup", url: "https://zuup.dev", icon: Globe, color: "#e8425a" },
  { name: "Theming", url: "https://theme.zuup.dev", icon: Palette, color: "#8b5cf6", beta: true },
  { name: "Giza Chapter", url: "https://giza.zuup.dev", icon: Triangle, color: "#f59e0b" },
  { name: "Time", url: "https://time.zuup.dev", icon: Clock, color: "#10b981" },
  { name: "Counseling", url: "https://counseling.zuup.dev", icon: HeartHandshake, color: "#ec4899" },
  { name: "Certificates", url: "https://validate.zuup.dev", icon: Award, color: "#38bdf8" },
  { name: "Workshops", url: "https://workshops.zuup.dev", icon: Calendar, color: "#f97316" },
  { name: "People", url: "https://people.zuup.dev", icon: Users, color: "#6366f1", beta: true },
  { name: "Mail", url: "https://mail.zuup.dev", icon: Mail, color: "#e8425a", beta: true },
];

export default function Profile() {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [auditLog] = useState<AuditEvent[]>(() => getAuditLog());

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [funFact, setFunFact] = useState<string>("Loading fun fact...");
  
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [authTrafficData, setAuthTrafficData] = useState<any[]>([]);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [workshopsLoading, setWorkshopsLoading] = useState(true);
  const [hoveredWorkshop, setHoveredWorkshop] = useState<string | null>(null);

  const meta = user?.user_metadata || {};
  const displayName = (meta.full_name || meta.name || user?.email?.split("@")[0] || "User") as string;
  const avatarUrl = meta.avatar_url as string | undefined;
  const initial = displayName[0]?.toUpperCase() || "U";
  const isAdmin = ADMIN_EMAILS.includes(user?.email || "");
  const slackConnected = Boolean(meta.slack_connected);

  const greeting = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, [currentTime]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("https://uselessfacts.jsph.pl/api/v2/facts/random")
      .then(res => res.json())
      .then(data => setFunFact(data.text))
      .catch(() => setFunFact("The first computer mouse was made of wood."));

    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setMetrics({
            activeConnections: data.activeConnections,
            ramUsage: data.ramUsage,
            cfRequests24h: data.cfRequests24h,
            cfBandwidth24h: data.cfBandwidth24h,
            cfThreats24h: data.cfThreats24h
          });
          setAuthTrafficData(data.trafficGraph || []);
        } else {
          throw new Error("Backend function not available");
        }
      } catch (err) {
        setMetrics({ activeConnections: "—", ramUsage: "—", cfRequests24h: "—", cfBandwidth24h: "—", cfThreats24h: "—" });
        setAuthTrafficData(Array.from({ length: 24 }).map((_, i) => ({ time: `${i}:00`, requests: 0, sessions: 0 })));
      } finally {
        setMetricsLoading(false);
      }
    };
    
    const fetchWorkshops = async () => {
      try {
        const { data } = await supabase
          .from('workshops')
          .select('*')
          .order('starts_at', { ascending: false })
          .limit(20);
        
        if (data) {
          setWorkshops(data);
        }
      } catch (err) {
        console.warn("Workshops fetch warning:", err);
      } finally {
        setWorkshopsLoading(false);
      }
    };

    fetchMetrics();
    fetchWorkshops();
  }, []);

  const handleSignOut = async () => {
    logAuditEvent({ type: "logout", user_id: user?.id });
    await signOut();
    navigate("/login");
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    toast.info("AI Search memory coming soon!");
  };

  const lastSignInApp = useMemo(() => {
    if (auditLog.length > 0) {
      const lastAuth = auditLog.find(log => log.type === "consent_granted" || log.type === "token_issued");
      if (lastAuth && lastAuth.client_id) {
        const clients = getRegisteredClients();
        return clients[lastAuth.client_id]?.name || lastAuth.client_id;
      }
    }
    return "Zuup Central"; 
  }, [auditLog]);

  const groupedWorkshops = useMemo(() => {
    const groups: Record<string, any[]> = {};
    workshops.forEach(w => {
      const d = new Date(w.starts_at);
      const key = d.toLocaleDateString([], { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(w);
    });
    return groups;
  }, [workshops]);

  const isSummerCohortParticipant = useMemo(() => {
    if (meta.programs && Array.isArray(meta.programs) && meta.programs.includes("Summer Cohort")) {
      return true;
    }
    if (user?.email?.endsWith("@zuup.dev")) return true;
    return false;
  }, [meta, user?.email]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#050505",
      backgroundImage: "radial-gradient(circle at 50% 0%, rgba(232, 66, 90, 0.08) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(56, 189, 248, 0.05) 0%, transparent 50%)",
      color: "#e8eaf0",
      fontFamily: "'Inter',system-ui,sans-serif",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      overflow: "hidden"
    }}>
      
      <div style={{ position: "absolute", top: "20%", left: "10%", width: "300px", height: "300px", background: "rgba(232,66,90,0.03)", filter: "blur(100px)", borderRadius: "50%", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "10%", right: "20%", width: "400px", height: "400px", background: "rgba(139,92,246,0.03)", filter: "blur(120px)", borderRadius: "50%", zIndex: 0 }} />

      {/* Top Navigation */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 32px", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: "8px" }}>
             <span style={{ background: "linear-gradient(135deg, #e8425a, #f06080)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Zuup</span>
             <span>Dashboard</span>
             <span style={{ background: "rgba(232, 66, 90, 0.1)", color: "#e8425a", fontSize: "10px", padding: "2px 6px", borderRadius: "100px", textTransform: "uppercase", fontWeight: 700 }}>Beta</span>
          </span>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={{ background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "8px", borderRadius: "50%", transition: "background 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Grid3x3 size={22} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ width: "320px", background: "rgba(15, 17, 23, 0.8)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {ZUUP_APPS.map(app => (
                  <a key={app.name} href={app.url} target="_blank" rel="noopener noreferrer" 
                    style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", textDecoration: "none", color: "#e8eaf0", padding: "12px 8px", borderRadius: "12px", transition: "background 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    {app.beta && <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(232, 66, 90, 0.2)", color: "#e8425a", fontSize: 8, fontWeight: 700, padding: "2px 4px", borderRadius: 4, textTransform: "uppercase" }}>Beta</div>}
                    <div style={{ width: 44, height: 44, borderRadius: "12px", background: "rgba(255,255,255,0.03)", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "20px", border: "1px solid rgba(255,255,255,0.05)", color: app.color }}>
                      <app.icon size={22} />
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 500, textAlign: "center" }}>{app.name}</span>
                  </a>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, borderRadius: "50%", transition: "transform 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                {avatarUrl
                  ? <img src={avatarUrl} alt={displayName} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.1)" }} />
                  : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#e8425a,#f06080)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: 16, color: "white", border: "2px solid rgba(255,255,255,0.1)" }}>{initial}</div>
                }
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ width: "240px", background: "rgba(15, 17, 23, 0.9)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "8px" }}>
              <DropdownMenuLabel>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>{displayName}</span>
                  <span style={{ fontWeight: 400, fontSize: "12px", color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.1)" }} />
              <DropdownMenuItem style={{ cursor: "pointer", gap: "10px", padding: "10px" }} onClick={() => navigate("/manage")}>
                <Settings size={16} /> Manage Account
              </DropdownMenuItem>
              <DropdownMenuItem style={{ cursor: "pointer", gap: "10px", padding: "10px" }} asChild>
                <a href="https://faraway.zuup.dev/slack" target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
                  <img src="https://cdn.brandfetch.io/slack.com/icon/theme/dark/fallback/transparent" width={16} height={16} alt="Slack" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  Join Slack Community
                </a>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem style={{ cursor: "pointer", gap: "10px", padding: "10px", color: "#e8425a" }} onClick={() => navigate("/admin")}>
                  <Users size={16} /> Admin Panel
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator style={{ background: "rgba(255,255,255,0.1)" }} />
              <DropdownMenuItem style={{ cursor: "pointer", gap: "10px", padding: "10px", color: "#a1a1aa" }} onClick={handleSignOut}>
                <LogOut size={16} /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "0 20px 40px", position: "relative", zIndex: 10, width: "100%" }}>
        
        <div className="animate-in slide-in-from-bottom-8 fade-in duration-700" style={{ width: "100%", maxWidth: "1440px", margin: "0 auto", display: "grid", gridTemplateColumns: "300px 1fr 340px", gap: "32px", alignItems: "start" }}>
          
          {/* ================= LEFT COLUMN: TIME & WORKSHOPS ================= */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Clock Widget */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "24px", padding: "24px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ fontSize: "48px", fontWeight: 800, letterSpacing: "-1px", color: "#e8eaf0", lineHeight: 1 }}>
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(/(AM|PM)/, '')}
                </span>
                <span style={{ fontSize: "16px", fontWeight: 600, color: "#a1a1aa" }}>
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).match(/(AM|PM)/)?.[0]}
                </span>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: "16px", fontWeight: 500, color: "#8b5cf6" }}>
                {currentTime.toLocaleDateString([], { weekday: 'long' })}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "14px", color: "#71717a" }}>
                {currentTime.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Workshops Calendar Widget */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "24px", padding: "20px", display: "flex", flexDirection: "column" }}>
              <p style={{ margin: "0 0 16px", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", gap: 8, color: "#e8eaf0" }}>
                <Calendar size={18} color="#f59e0b" /> Zuup Calendar
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                {workshopsLoading ? (
                  <p style={{ fontSize: 13, color: "#71717a", textAlign: "center", padding: "20px 0" }}>Loading calendar...</p>
                ) : workshops.length === 0 ? (
                  <p style={{ fontSize: 13, color: "#71717a", textAlign: "center", padding: "20px 0" }}>No workshops found.</p>
                ) : (
                  Object.entries(groupedWorkshops).map(([month, ws]) => (
                    <div key={month}>
                      <h4 style={{ margin: "0 0 12px", fontSize: "12px", fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
                        {month}
                        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {ws.map(w => (
                          <div key={w.id} 
                            onMouseEnter={() => setHoveredWorkshop(w.id)}
                            onMouseLeave={() => setHoveredWorkshop(null)}
                            style={{ 
                              background: "rgba(255,255,255,0.03)", 
                              border: "1px solid rgba(255,255,255,0.05)", 
                              borderRadius: "16px", 
                              padding: "16px", 
                              transition: "all 0.2s",
                              cursor: "pointer",
                              transform: hoveredWorkshop === w.id ? "translateX(4px)" : "translateX(0)"
                            }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <div style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", padding: "4px 8px", borderRadius: "8px", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                {new Date(w.starts_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </div>
                              <div style={{ fontSize: "12px", color: "#a1a1aa", display: "flex", alignItems: "center", gap: 4 }}>
                                <Clock size={12} /> {new Date(w.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <h4 style={{ margin: "0 0 6px", fontSize: "15px", fontWeight: 600, color: "#e8eaf0", lineHeight: 1.3 }}>{w.title}</h4>
                            
                            {hoveredWorkshop === w.id && w.description && (
                              <p style={{ margin: "0 0 12px", fontSize: "12px", color: "#a1a1aa", lineHeight: 1.4 }} className="animate-in fade-in duration-200">
                                {w.description.length > 80 ? w.description.substring(0, 80) + "..." : w.description}
                              </p>
                            )}
                            
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11px", color: "#71717a" }}>
                                {w.mode === 'online' ? <Video size={12} /> : <MapPin size={12} />} {w.mode === 'online' ? 'Online' : 'In-Person'}
                              </div>
                              {hoveredWorkshop === w.id && (
                                <a href={`https://workshops.zuup.dev/${w.slug}`} target="_blank" rel="noopener noreferrer" 
                                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", fontWeight: 600, color: "#38bdf8", textDecoration: "none" }}
                                  className="animate-in slide-in-from-left-2 fade-in duration-200">
                                  Know more <ArrowRight size={12} />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Security & Access (Moved down left column) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "24px", padding: "20px", display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "grid", placeItems: "center" }}>
                  <Shield size={20} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Security Status</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#71717a" }}>Authorized via {lastSignInApp}</p>
                </div>
              </div>
              
              <div 
                onClick={() => navigate("/manage")}
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "24px", padding: "20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
              >
                {meta.aadhaar_last4 ? (
                  <>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "grid", placeItems: "center" }}>
                      <Shield size={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Identity Verified</p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#10b981", fontFamily: "monospace" }}>XXXX XXXX {meta.aadhaar_last4}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", display: "grid", placeItems: "center" }}>
                      <AlertCircle size={20} />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Identity Unverified</p>
                      <p style={{ margin: "4px 0 0", fontSize: 12, color: "#ef4444" }}>Click to verify via Aadhaar</p>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>


          {/* ================= CENTER COLUMN: CORE ACTIONS & EVENTS ================= */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            
            <div style={{ textAlign: "center", marginBottom: "40px", marginTop: "20px" }}>
              <h1 style={{ fontSize: "42px", fontWeight: 800, margin: "0 0 8px", background: "linear-gradient(135deg, #e8425a, #f06080, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Howdy, {displayName}! 👋
              </h1>
              <p style={{ fontSize: "18px", color: "#a1a1aa", margin: 0 }}>
                {greeting}. What are we building today?
              </p>
            </div>

            {/* AI Search Bar */}
            <form onSubmit={handleSearchSubmit} style={{ 
              width: "100%", 
              maxWidth: "640px",
              position: "relative",
              transform: isSearchFocused ? "scale(1.02)" : "scale(1)",
              transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            }}>
              <div style={{ 
                position: "absolute", 
                inset: "-1px", 
                background: isSearchFocused ? "linear-gradient(90deg, #e8425a, #8b5cf6, #38bdf8)" : "rgba(255,255,255,0.1)", 
                borderRadius: "24px", 
                filter: isSearchFocused ? "blur(8px)" : "blur(0)",
                opacity: isSearchFocused ? 0.6 : 1,
                transition: "all 0.3s ease"
              }} />
              <div style={{ 
                position: "relative",
                display: "flex", 
                alignItems: "center", 
                background: "rgba(10, 10, 15, 0.8)", 
                backdropFilter: "blur(20px)",
                borderRadius: "24px",
                padding: "4px 8px"
              }}>
                <Search size={22} style={{ color: isSearchFocused ? "#e8eaf0" : "#71717a", marginLeft: "16px" }} />
                <input 
                  type="text" 
                  placeholder="Ask Zuup AI or search memory..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  style={{ 
                    flex: 1, 
                    background: "transparent", 
                    border: "none", 
                    outline: "none", 
                    color: "#e8eaf0", 
                    fontSize: "18px", 
                    padding: "16px 16px",
                    fontWeight: 400
                  }} 
                />
                <button type="submit" style={{ 
                  background: "linear-gradient(135deg, #e8425a, #f06080)", 
                  border: "none", 
                  borderRadius: "20px", 
                  padding: "10px 24px", 
                  color: "white", 
                  fontWeight: 600, 
                  fontSize: "15px",
                  cursor: "pointer",
                  marginRight: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}>
                  <Sparkles size={16} /> Enter
                </button>
              </div>
            </form>

            {/* Fun Fact Display */}
            <div style={{ marginTop: "24px", background: "rgba(255,255,255,0.03)", padding: "12px 20px", borderRadius: "100px", display: "flex", alignItems: "center", gap: "10px", color: "#a1a1aa", fontSize: "13px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <Lightbulb size={14} style={{ color: "#f59e0b" }} />
              <span style={{ fontStyle: "italic" }}>{funFact}</span>
            </div>

            {/* Explore Zuup Events */}
            <div style={{ width: "100%", marginTop: "40px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 18, color: "#e8eaf0" }}>
                What's going on at Zuup
              </p>

              {/* Zuup ID Card CTA */}
              <div
                onClick={() => navigate("/card")}
                style={{
                  cursor: "pointer",
                  background: "linear-gradient(135deg, rgba(255,61,127,0.08) 0%, rgba(139,92,246,0.06) 100%)",
                  border: "1px solid rgba(255,61,127,0.25)",
                  borderRadius: "24px",
                  padding: "20px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.25s",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,61,127,0.14) 0%, rgba(139,92,246,0.1) 100%)";
                  e.currentTarget.style.borderColor = "rgba(255,61,127,0.4)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,61,127,0.15)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(255,61,127,0.08) 0%, rgba(139,92,246,0.06) 100%)";
                  e.currentTarget.style.borderColor = "rgba(255,61,127,0.25)";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Pink glow blob */}
                <div style={{ position: "absolute", right: "-20px", top: "-20px", width: "100px", height: "100px", background: "radial-gradient(circle, rgba(255,61,127,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, rgba(255,61,127,0.2), rgba(139,92,246,0.2))",
                    border: "1px solid rgba(255,61,127,0.3)",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "22px",
                  }}>
                    🪪
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#e8eaf0", fontFamily: "'Caveat', cursive" }}>
                      View Your Zuup Card
                    </h3>
                    <p style={{ margin: 0, fontSize: "13px", color: "#a1a1aa" }}>
                      Your 3D identity card — with QR code &amp; profile link.
                    </p>
                  </div>
                </div>
                <div style={{ background: "linear-gradient(135deg, #FF3D7F, #a855f7)", color: "#fff", padding: "8px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: 700, flexShrink: 0, boxShadow: "0 4px 12px rgba(255,61,127,0.3)" }}>
                  Open Card
                </div>
              </div>

              {/* Join Slack Community Card */}
              <a href="https://faraway.zuup.dev/slack" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block", width: "100%" }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "24px", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "grid", placeItems: "center" }}>
                      <img src="https://cdn.brandfetch.io/slack.com/icon/theme/dark/fallback/transparent" width={24} height={24} alt="Slack" />
                    </div>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 700, color: "#e8eaf0" }}>Join the Zuup Slack Community</h3>
                      <p style={{ margin: 0, fontSize: "14px", color: "#a1a1aa" }}>Connect with other builders, get help, and stay updated.</p>
                    </div>
                  </div>
                  <div style={{ background: "#e8eaf0", color: "#050505", padding: "8px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: 700 }}>
                    Join Now
                  </div>
                </div>
              </a>

              {/* Zuup Summer Cohort Card */}
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "24px", padding: "24px", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "grid", placeItems: "center" }}>
                        <Cpu size={18} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#e8eaf0" }}>Zuup Summer Cohort</h3>
                    </div>
                    <p style={{ margin: 0, fontSize: "14px", color: "#a1a1aa" }}>Intensive 3-month engineering program.</p>
                  </div>
                  
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    {isSummerCohortParticipant ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(16, 185, 129, 0.1)", padding: "8px 16px", borderRadius: "100px" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#10b981" }}>Participating</span>
                      </div>
                    ) : (
                      <button style={{ background: "#e8eaf0", color: "#050505", border: "none", borderRadius: "100px", padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "opacity 0.2s" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "0.9"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                        onClick={() => window.open('https://summer.zuup.dev', '_blank', 'noopener,noreferrer')}
                      >
                        Apply to Cohort
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ================= RIGHT COLUMN: LIVE TRAFFIC & STATS ================= */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* Live Auth Traffic Graph */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "24px", padding: "24px" }}>
              <p style={{ margin: "0 0 16px", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", gap: 8, color: "#e8eaf0" }}>
                <Globe size={18} color="#8b5cf6" /> Live Auth Traffic
              </p>
              <div style={{ height: 200, margin: "0 -10px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={authTrafficData}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ background: "rgba(15, 17, 23, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: "12px" }}
                      itemStyle={{ color: "#e8eaf0" }}
                      labelStyle={{ display: "none" }}
                    />
                    <Area type="monotone" dataKey="requests" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                    <Area type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sparkline Feed */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", gap: 8, color: "#e8eaf0" }}>
                <Activity size={18} color="#38bdf8" /> Live Stats Feed
              </p>

              {/* Active Connections */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", height: 110 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981", marginBottom: 4 }}>
                    <Database size={14} /> <span style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa" }}>Active Conns</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#e8eaf0" }}>{metricsLoading ? "…" : (metrics?.activeConnections || "—")}</p>
                </div>
                <div style={{ position: "absolute", bottom: -5, left: -5, right: -5, height: 40 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={authTrafficData}>
                      <defs>
                        <linearGradient id="colorConn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="sessions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorConn)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Edge Requests */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", height: 110 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#38bdf8", marginBottom: 4 }}>
                    <Globe size={14} /> <span style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa" }}>Requests (24h)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#e8eaf0" }}>{metricsLoading ? "…" : (metrics?.cfRequests24h || "—")}</p>
                </div>
                <div style={{ position: "absolute", bottom: -5, left: -5, right: -5, height: 40 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={authTrafficData}>
                      <defs>
                        <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="requests" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorReq)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bandwidth */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", height: 110 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8b5cf6", marginBottom: 4 }}>
                    <Server size={14} /> <span style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa" }}>Bandwidth (24h)</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#e8eaf0" }}>{metricsLoading ? "…" : (metrics?.cfBandwidth24h || "—")}</p>
                </div>
                <div style={{ position: "absolute", bottom: -5, left: -5, right: -5, height: 40 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={authTrafficData}>
                      <defs>
                        <linearGradient id="colorBw" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="bytes" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorBw)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Security Threats */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", height: 110 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f59e0b", marginBottom: 4 }}>
                    <Shield size={14} /> <span style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa" }}>Threats Blocked</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#e8eaf0" }}>{metricsLoading ? "…" : (metrics?.cfThreats24h || "—")}</p>
                </div>
                <div style={{ position: "absolute", bottom: -5, left: -5, right: -5, height: 40 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={authTrafficData}>
                      <defs>
                        <linearGradient id="colorThr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="threats" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorThr)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
