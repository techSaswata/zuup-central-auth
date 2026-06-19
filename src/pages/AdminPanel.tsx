import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { RefreshCw, Search, ChevronDown, ChevronUp, Copy, Check, Users, Shield, Clock, X, Mail, Edit, Trash2, Calendar, Plus, ExternalLink, Image as ImageIcon, ShieldOff } from "lucide-react";

interface SupabaseUser {
  id: string;
  email?: string;
  created_at: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ provider: string; id: string }>;
  phone?: string;
  email_confirmed_at?: string;
  banned_until?: string;
}

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{ border: "none", background: "none", color: "#6b7280", cursor: "pointer", padding: "2px 4px", borderRadius: 4 }}
      title="Copy"
    >
      {copied ? <Check size={12} style={{ color: "#10b981" }} /> : <Copy size={12} />}
    </button>
  );
}

function Avatar({ user }: { user: SupabaseUser }) {
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const name = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || "?") as string;
  const initial = name[0]?.toUpperCase() || "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#e8425a,#f06080)",
      display: "grid", placeItems: "center", fontWeight: 700, fontSize: 13, color: "white"
    }}>{initial}</div>
  );
}

function MetaDrawer({ user, onClose, adminClient, refreshUsers }: { user: SupabaseUser; onClose: () => void; adminClient: any; refreshUsers: () => void }) {
  const [loadingAction, setLoadingAction] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState((user.user_metadata?.full_name || user.user_metadata?.name || "") as string);

  const handleResetPassword = async () => {
    if (!adminClient || !user.email) return;
    setLoadingAction(true);
    try {
      const { error } = await adminClient.auth.resetPasswordForEmail(user.email, {
        redirectTo: 'https://auth.zuup.dev/manage',
      });
      if (error) throw error;
      
      toast.success("Recovery email successfully sent to user!");
    } catch (e: any) {
      toast.error(e.message || "Failed to send reset email");
    }
    setLoadingAction(false);
  };

  const handleSaveEdit = async () => {
    if (!adminClient) return;
    setLoadingAction(true);
    try {
      const { error } = await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, full_name: editName, name: editName }
      });
      if (error) throw error;
      toast.success("User metadata updated!");
      setIsEditing(false);
      refreshUsers();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to edit user");
    }
    setLoadingAction(false);
  };

  const handleDelete = async () => {
    if (!adminClient) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${user.email}? This cannot be undone.`)) return;
    setLoadingAction(true);
    try {
      const { error } = await adminClient.auth.admin.deleteUser(user.id);
      if (error) throw error;
      toast.success("User deleted successfully.");
      onClose();
      refreshUsers();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete user");
    }
    setLoadingAction(false);
  };

  const handleUnlinkAadhaar = async () => {
    if (!adminClient) return;
    if (!window.confirm(`Are you sure you want to remove Aadhaar verification data for ${user.email}? This will un-verify their account.`)) return;
    setLoadingAction(true);
    try {
      const newMeta: any = { ...user.user_metadata };
      newMeta.aadhaar_last4 = null;
      newMeta.address_line1 = null;
      newMeta.address_line2 = null;
      newMeta.city = null;
      newMeta.state_region = null;
      newMeta.postal_code = null;
      
      const { error } = await adminClient.auth.admin.updateUserById(user.id, {
        user_metadata: newMeta
      });
      if (error) throw error;
      toast.success("Aadhaar data removed successfully.");
      refreshUsers();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove Aadhaar data");
    }
    setLoadingAction(false);
  };

  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 6,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "8px 12px", color: "#e8eaf0", fontSize: 13,
    cursor: "pointer", transition: "background 0.2s"
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center"
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111318", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 720,
          padding: 28, maxHeight: "85vh", overflowY: "auto"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar user={user} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                {(user.user_metadata?.full_name || user.user_metadata?.name || user.email || "Unknown") as string}
                {user.user_metadata?.aadhaar_last4 && (
                  <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: "bold", fontFamily: "monospace" }}>
                    ✓ UIDAI: {user.user_metadata.aadhaar_last4 as string}
                  </span>
                )}
              </p>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 12 }}>{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#9ca3af", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          <button onClick={handleResetPassword} disabled={loadingAction} style={btnStyle} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
            <Mail size={14} /> Send Password Reset
          </button>
          <button onClick={() => setIsEditing(!isEditing)} disabled={loadingAction} style={btnStyle} onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
            <Edit size={14} /> {isEditing ? "Cancel Edit" : "Edit User"}
          </button>
          <button onClick={handleDelete} disabled={loadingAction} style={{ ...btnStyle, background: "rgba(232,66,90,0.1)", color: "#e8425a", border: "1px solid rgba(232,66,90,0.2)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(232,66,90,0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(232,66,90,0.1)"}>
            <Trash2 size={14} /> Delete
          </button>
          {user.user_metadata?.aadhaar_last4 && (
            <button onClick={handleUnlinkAadhaar} disabled={loadingAction} style={{ ...btnStyle, background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "1px solid rgba(245, 158, 11, 0.2)" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(245, 158, 11, 0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(245, 158, 11, 0.1)"}>
              <ShieldOff size={14} /> Unlink Aadhaar
            </button>
          )}
        </div>

        {isEditing && (
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600 }}>Edit User Metadata</p>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4 }}>Full Name</label>
                <input 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)}
                  style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none" }}
                />
              </div>
              <button onClick={handleSaveEdit} disabled={loadingAction} style={{ background: "linear-gradient(135deg, #e8425a, #f06080)", border: "none", borderRadius: 6, padding: "8px 16px", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", height: 35 }}>
                {loadingAction ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
          {[
            ["UUID", user.id],
            ["Email", user.email || "—"],
            ["Phone", user.phone || "—"],
            ["Provider(s)", user.identities?.map(i => i.provider).join(", ") || "email"],
            ["Email verified", user.email_confirmed_at ? new Date(user.email_confirmed_at).toLocaleString() : "No"],
            ["Created", new Date(user.created_at).toLocaleString()],
            ["Last sign-in", user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "Never"],
            ["Banned until", user.banned_until || "—"],
          ].map(([label, value]) => (
            <div key={label} style={{
              display: "flex", gap: 8, alignItems: "center",
              background: "rgba(255,255,255,0.03)", borderRadius: 8,
              padding: "8px 12px", border: "1px solid rgba(255,255,255,0.06)"
            }}>
              <span style={{ width: 120, color: "#6b7280", fontSize: 12, flexShrink: 0 }}>{label}</span>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: "#e8eaf0", flex: 1, wordBreak: "break-all" }}>{value}</span>
              <CopyBtn value={value as string} />
            </div>
          ))}
        </div>

        {user.user_metadata && Object.keys(user.user_metadata).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>user_metadata</p>
            <pre style={{
              background: "#0a0b0f", borderRadius: 10, padding: 14, fontSize: 11,
              color: "#a3e6c8", overflowX: "auto", border: "1px solid rgba(255,255,255,0.06)",
              whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 280, overflowY: "auto"
            }}>
              {JSON.stringify(user.user_metadata, null, 2)}
            </pre>
          </div>
        )}

        {user.app_metadata && Object.keys(user.app_metadata).length > 0 && (
          <div>
            <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>app_metadata</p>
            <pre style={{
              background: "#0a0b0f", borderRadius: 10, padding: 14, fontSize: 11,
              color: "#c4b5fd", overflowX: "auto", border: "1px solid rgba(255,255,255,0.06)",
              whiteSpace: "pre-wrap", wordBreak: "break-all"
            }}>
              {JSON.stringify(user.app_metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function EventsTab({ adminClient }: { adminClient: any }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [mode, setMode] = useState("online");
  const [bannerUrl, setBannerUrl] = useState("");

  const fetchEvents = useCallback(async () => {
    if (!adminClient) return;
    setLoading(true);
    try {
      const { data, error } = await adminClient.from('workshops').select('*').order('starts_at', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [adminClient]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminClient) return;
    if (!title || !startsAt || !mode) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    setActionLoading(true);
    try {
      const payload: any = {
        title,
        description: description || null,
        slug: slug || null,
        mode,
        banner_url: bannerUrl || null,
        starts_at: new Date(startsAt).toISOString()
      };

      const { error } = await adminClient.from('workshops').insert(payload);
      if (error) throw error;
      
      toast.success("Event created successfully!");
      setIsAdding(false);
      setTitle("");
      setDescription("");
      setSlug("");
      setStartsAt("");
      setBannerUrl("");
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to create event");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!adminClient) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    
    try {
      const { error } = await adminClient.from('workshops').delete().eq('id', id);
      if (error) throw error;
      toast.success("Event deleted!");
      fetchEvents();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete event");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none",
    marginTop: 6
  };

  const labelStyle: React.CSSProperties = { fontSize: 12, color: "#9ca3af", fontWeight: 600 };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Calendar & Events</p>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 12 }}>
            Manage events, workshops, and cohorts. Saved to `public.workshops` table.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          style={{ display: "flex", alignItems: "center", gap: 6, background: isAdding ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #e8425a, #f06080)", border: "none", color: "#fff", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          {isAdding ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Create Event</>}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="animate-in fade-in slide-in-from-top-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 24, marginBottom: 32 }}>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>Create New Event</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Event Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Zuup Summer Cohort" style={inputStyle} />
            </div>
            
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief details about the event..." style={{ ...inputStyle, resize: "vertical" }} />
            </div>

            <div>
              <label style={labelStyle}>Start Date & Time *</label>
              <input type="datetime-local" required value={startsAt} onChange={e => setStartsAt(e.target.value)} style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Mode *</label>
              <select value={mode} onChange={e => setMode(e.target.value)} style={inputStyle}>
                <option value="online">Online</option>
                <option value="offline">In-Person</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>URL Slug</label>
              <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="e.g. summer-cohort" style={inputStyle} />
              <span style={{ fontSize: 11, color: "#6b7280", marginTop: 4, display: "block" }}>Users will be redirected to workshops.zuup.dev/[slug]</span>
            </div>

            <div>
              <label style={labelStyle}>Banner Image URL</label>
              <input value={bannerUrl} onChange={e => setBannerUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
            </div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
            <button type="submit" disabled={actionLoading} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #10b981, #059669)", border: "none", borderRadius: 8, padding: "10px 24px", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {actionLoading ? "Saving..." : "Save Event"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Loading events...</div>
      ) : events.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16, color: "#9ca3af" }}>
          <Calendar size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No events found in `public.workshops`.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {events.map(ev => (
            <div key={ev.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 20, display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ width: 100, height: 100, borderRadius: 12, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {ev.banner_url ? <img src={ev.banner_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={24} color="#6b7280" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#e8eaf0" }}>{ev.title}</h3>
                  <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(255,255,255,0.1)", padding: "2px 8px", borderRadius: 100, color: "#a1a1aa", textTransform: "uppercase" }}>{ev.mode}</span>
                </div>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "#9ca3af", lineHeight: 1.4, maxWidth: 600 }}>{ev.description || "No description provided."}</p>
                <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#6b7280" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={14} /> {new Date(ev.starts_at).toLocaleString()}</span>
                  {ev.slug && <a href={`https://workshops.zuup.dev/${ev.slug}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 4, color: "#38bdf8", textDecoration: "none" }}><ExternalLink size={14} /> workshops.zuup.dev/{ev.slug}</a>}
                </div>
              </div>
              <button onClick={() => handleDelete(ev.id, ev.title)} style={{ background: "rgba(232,66,90,0.1)", border: "1px solid rgba(232,66,90,0.2)", borderRadius: 8, padding: 10, color: "#e8425a", cursor: "pointer", transition: "background 0.2s" }}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"users" | "events">("users");
  
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<"created_at" | "last_sign_in_at" | "email">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedUser, setSelectedUser] = useState<SupabaseUser | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [adminClient, setAdminClient] = useState<any>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    let serviceKey = sessionStorage.getItem("admin_service_key");
    if (!serviceKey) {
      serviceKey = prompt("Developer Access: Please enter the Supabase Service Role Key to unlock the Admin Panel.");
      if (serviceKey) {
        sessionStorage.setItem("admin_service_key", serviceKey);
      }
    }

    if (!serviceKey) {
      setError("Service Role Key is required to access the Admin Panel. Refresh to enter the key.");
      setLoading(false);
      return;
    }

    try {
      const client = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      setAdminClient(client);
      
      const { data, error: fetchError } = await client.auth.admin.listUsers({ perPage: 1000 });
      if (fetchError) throw fetchError;
      setUsers(data.users || []);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.email?.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        ((u.user_metadata?.full_name || u.user_metadata?.name) as string || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const av = sortCol === "email" ? (a.email || "") : (a[sortCol] || "");
      const bv = sortCol === "email" ? (b.email || "") : (b[sortCol] || "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: typeof sortCol }) => sortCol === col
    ? (sortDir === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />)
    : null;

  const cell: React.CSSProperties = { padding: "10px 14px", fontSize: 12, borderBottom: "1px solid rgba(255,255,255,0.04)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 };
  const headCell: React.CSSProperties = { ...cell, color: "#6b7280", fontWeight: 600, background: "rgba(255,255,255,0.03)", cursor: "pointer", userSelect: "none" };

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: "24px", marginBottom: "32px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <button
          onClick={() => setActiveTab("users")}
          style={{ background: "none", border: "none", padding: "0 0 12px 0", fontSize: 15, fontWeight: 600, color: activeTab === "users" ? "#e8425a" : "#9ca3af", borderBottom: activeTab === "users" ? "2px solid #e8425a" : "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Users size={16} /> User Management</div>
        </button>
        <button
          onClick={() => setActiveTab("events")}
          style={{ background: "none", border: "none", padding: "0 0 12px 0", fontSize: 15, fontWeight: 600, color: activeTab === "events" ? "#e8425a" : "#9ca3af", borderBottom: activeTab === "events" ? "2px solid #e8425a" : "2px solid transparent", cursor: "pointer", transition: "all 0.2s" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Calendar size={16} /> Calendar & Events</div>
        </button>
      </div>

      {activeTab === "users" && (
        <div className="animate-in fade-in">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>User Management</p>
              <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 12 }}>
                {loading ? "Loading users..." : `${users.length} total users · Last sync ${lastRefresh.toLocaleTimeString()}`}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#6b7280" }} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, email, UUID…"
                  style={{
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8, padding: "8px 12px 8px 32px", color: "#e8eaf0", fontSize: 13,
                    outline: "none", width: 240
                  }}
                />
              </div>
              <button
                onClick={fetchUsers}
                disabled={loading}
                style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#9ca3af", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(232,66,90,0.1)", border: "1px solid rgba(232,66,90,0.3)", borderRadius: 10, padding: "16px", marginBottom: 24, fontSize: 14, color: "#f87171", lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[
              { icon: <Users size={16} />, label: "Total Users", value: users.length },
              { icon: <Shield size={16} />, label: "Verified", value: users.filter(u => u.email_confirmed_at).length },
              { icon: <Clock size={16} />, label: "Active (30d)", value: users.filter(u => u.last_sign_in_at && Date.now() - new Date(u.last_sign_in_at).getTime() < 30 * 86400_000).length },
            ].map(stat => (
              <div key={stat.label} style={{
                flex: 1, minWidth: 140, background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, color: "#e8425a" }}>{stat.icon}</div>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{loading ? "…" : stat.value}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#6b7280" }}>{stat.label}</p>
              </div>
            ))}
          </div>

          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: 48 }} />
                  <col style={{ width: 180 }} />
                  <col style={{ width: 200 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 140 }} />
                  <col style={{ width: 100 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={headCell}></th>
                    <th style={headCell} onClick={() => toggleSort("email")}>Email <SortIcon col="email" /></th>
                    <th style={headCell}>Name / UUID</th>
                    <th style={headCell} onClick={() => toggleSort("created_at")}>Created <SortIcon col="created_at" /></th>
                    <th style={headCell} onClick={() => toggleSort("last_sign_in_at")}>Last Sign-In <SortIcon col="last_sign_in_at" /></th>
                    <th style={headCell}>Provider</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} style={cell}>
                          <div style={{ height: 12, borderRadius: 4, background: "rgba(255,255,255,0.05)", animation: "shimmer 1.4s infinite" }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ ...cell, textAlign: "center", color: "#6b7280", padding: "32px" }}>
                        {error ? "Could not load users" : "No users found"}
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.map((u) => {
                    const name = (u.user_metadata?.full_name || u.user_metadata?.name || "") as string;
                    const provider = u.identities?.[0]?.provider || "email";
                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        style={{ cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ ...cell, overflow: "visible" }}><Avatar user={u} /></td>
                        <td style={cell}>
                          <span style={{ color: "#e8eaf0" }}>{u.email || "—"}</span>
                          {u.email_confirmed_at && <span style={{ marginLeft: 4, color: "#10b981", fontSize: 10 }}>✓</span>}
                        </td>
                        <td style={cell}>
                          <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 12 }}>{name || "—"}</p>
                          <p style={{ margin: 0, color: "#6b7280", fontSize: 10, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6 }}>
                            {u.id.slice(0, 18)}…
                            {u.user_metadata?.aadhaar_last4 && (
                              <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "1px 6px", borderRadius: 4, fontWeight: "bold", fontSize: 9 }}>
                                UIDAI {u.user_metadata.aadhaar_last4 as string}
                              </span>
                            )}
                          </p>
                        </td>
                        <td style={{ ...cell, color: "#9ca3af" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                        <td style={{ ...cell, color: "#9ca3af" }}>
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : <span style={{ color: "#4b5563" }}>Never</span>}
                        </td>
                        <td style={cell}>
                          <span style={{
                            background: provider === "google" ? "rgba(234,67,53,0.15)" : provider === "github" ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.15)",
                            color: provider === "google" ? "#ea4335" : provider === "github" ? "#e8eaf0" : "#818cf8",
                            padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600
                          }}>{provider}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!loading && filtered.length > 0 && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.04)", color: "#6b7280", fontSize: 12 }}>
                Showing {filtered.length} of {users.length} users
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "events" && (
        <div className="animate-in fade-in">
          <EventsTab adminClient={adminClient} />
        </div>
      )}

      {selectedUser && <MetaDrawer user={selectedUser} onClose={() => setSelectedUser(null)} adminClient={adminClient} refreshUsers={fetchUsers} />}
    </div>
  );
}
