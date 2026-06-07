const fs = require('fs');

let content = fs.readFileSync('src/pages/Profile.tsx', 'utf8');

const mainStartStr = `{/* Main Content Area */}`;
const endStr = `</main>\n    </div>\n  );\n}\n`;

const startIndex = content.indexOf(mainStartStr);
const endIndex = content.indexOf(endStr);

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

const newMain = `      {/* Main Content Area */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "40px 20px", position: "relative", zIndex: 10, width: "100%" }}>
        
        <div className="animate-in slide-in-from-bottom-8 fade-in duration-700" style={{ width: "100%", maxWidth: "1280px", margin: "0 auto", display: "grid", gridTemplateColumns: "280px 1fr 280px", gap: "40px", alignItems: "start" }}>
          
          {/* ================= LEFT COLUMN: WIDGETS ================= */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", gap: 8, color: "#e8eaf0" }}>
              <Shield size={18} color="#10b981" /> Profile Hub
            </p>
            
            {/* Last Sign-In Card */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "20px", padding: "20px", position: "relative", overflow: "hidden", transition: "transform 0.2s, background 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(16, 185, 129, 0.1)", color: "#10b981", display: "grid", placeItems: "center" }}>
                  <Shield size={16} />
                </div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Security & Access</p>
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#a1a1aa" }}>Last authorized via Supabase</p>
              <p style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 600, color: "#e8eaf0" }}>{lastSignInApp}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#71717a" }}>
                <Clock size={12} /> {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Unknown"}
              </div>
            </div>

            {/* Cohort Participation Card */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "20px", padding: "20px", position: "relative", overflow: "hidden", transition: "transform 0.2s, background 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6", display: "grid", placeItems: "center" }}>
                  <Cpu size={16} />
                </div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Active Programs</p>
              </div>
              <p style={{ margin: "0 0 4px", fontSize: 13, color: "#a1a1aa" }}>Zuup Summer Cohort</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                {isSummerCohortParticipant ? (
                  <>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 10px #10b981" }} />
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#10b981" }}>Participating</span>
                  </>
                ) : (
                  <>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#71717a" }} />
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#71717a" }}>Not Enrolled</span>
                  </>
                )}
              </div>
              {!isSummerCohortParticipant && (
                <button style={{ marginTop: 16, background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#e8eaf0", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <Plus size={12} /> Apply Now
                </button>
              )}
            </div>
          </div>


          {/* ================= CENTER COLUMN: CORE TOOLS ================= */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            
            <div style={{ textAlign: "center", marginBottom: "40px" }}>
              <h1 style={{ fontSize: "42px", fontWeight: 800, margin: "0 0 8px", background: "linear-gradient(135deg, #ffffff, #a1a1aa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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

            {/* Authentication Traffic Graph */}
            <div style={{ width: "100%", marginTop: "40px" }}>
              <p style={{ margin: "0 0 16px", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Globe size={18} color="#8b5cf6" /> Live Auth Traffic
              </p>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px", height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={authTrafficData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="time" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ background: "rgba(15, 17, 23, 0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                      itemStyle={{ color: "#e8eaf0" }}
                    />
                    <Area type="monotone" dataKey="requests" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                    <Area type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorSessions)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN: LIVE STATS FEED ================= */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 600, fontSize: 16, display: "flex", alignItems: "center", gap: 8, color: "#e8eaf0" }}>
              <Activity size={18} color="#38bdf8" /> Live Stats
            </p>

            {/* Active Connections */}
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", height: 130 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10b981", marginBottom: 4 }}>
                  <Database size={14} /> <span style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa" }}>Active Conns</span>
                </div>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#e8eaf0" }}>{metricsLoading ? "…" : (metrics?.activeConnections || "—")}</p>
              </div>
              <div style={{ position: "absolute", bottom: -5, left: -5, right: -5, height: 50 }}>
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
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", height: 130 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#38bdf8", marginBottom: 4 }}>
                  <Globe size={14} /> <span style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa" }}>Requests (24h)</span>
                </div>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#e8eaf0" }}>{metricsLoading ? "…" : (metrics?.cfRequests24h || "—")}</p>
              </div>
              <div style={{ position: "absolute", bottom: -5, left: -5, right: -5, height: 50 }}>
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
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", height: 130 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#8b5cf6", marginBottom: 4 }}>
                  <Server size={14} /> <span style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa" }}>Bandwidth (24h)</span>
                </div>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#e8eaf0" }}>{metricsLoading ? "…" : (metrics?.cfBandwidth24h || "—")}</p>
              </div>
              <div style={{ position: "absolute", bottom: -5, left: -5, right: -5, height: 50 }}>
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
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between", height: 130 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f59e0b", marginBottom: 4 }}>
                  <Shield size={14} /> <span style={{ fontSize: 12, fontWeight: 600, color: "#a1a1aa" }}>Threats Blocked</span>
                </div>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#e8eaf0" }}>{metricsLoading ? "…" : (metrics?.cfThreats24h || "—")}</p>
              </div>
              <div style={{ position: "absolute", bottom: -5, left: -5, right: -5, height: 50 }}>
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
`;

fs.writeFileSync('src/pages/Profile.tsx', before + newMain + after);
console.log('Successfully updated Profile.tsx');
