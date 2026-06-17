import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EmployeeProfileFormProps {
  user: User;
  employee: any;
  onSaved: (emp: any) => void;
}

export default function EmployeeProfileForm({ user, employee, onSaved }: EmployeeProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    slug: "",
    bio: "",
    tagline: "",
    pronouns: "",
    phone: "",
    skills: "",
    instagram: "",
    linkedin: "",
    twitter: "",
    website: "",
    github: ""
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        slug: employee.slug || "",
        bio: employee.bio || "",
        tagline: employee.tagline || "",
        pronouns: employee.pronouns || "",
        phone: employee.phone || "",
        skills: Array.isArray(employee.skills) ? employee.skills.join(", ") : (employee.skills || ""),
        instagram: employee.instagram || "",
        linkedin: employee.linkedin || "",
        twitter: employee.twitter || "",
        website: employee.website || "",
        github: employee.github || ""
      });
    }
  }, [employee]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.slug.trim()) {
        throw new Error("Slug is required.");
      }

      const skillsArray = formData.skills.split(",").map(s => s.trim()).filter(Boolean);

      // Auto-filled/Locked fields for new inserts
      const insertPayload = {
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        email_primary: user.email,
        photo_url: user.user_metadata?.avatar_url || null,
        department: "Shipping at Zuup",
        chapter: "Remote",
        joined_at: new Date(user.created_at).toISOString().split('T')[0],
        ...formData,
        skills: skillsArray
      };

      // Since we don't know jagrit@zuup.dev's exact UUID without querying it, we do it in a safe way.
      // But we will just omit parent_id for now if it's too complex or we can query it first:
      const { data: jagrit } = await supabase.from('employees').select('id').eq('email_primary', 'jagrit@zuup.dev').single();
      if (jagrit) {
        (insertPayload as any).parent_id = jagrit.id;
      }

      const { data, error } = await supabase
        .from("employees")
        .upsert([insertPayload], { onConflict: "id" })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
           throw new Error("This slug is already taken. Please choose another one.");
        }
        throw error;
      }

      toast.success("Public Profile updated successfully!");
      onSaved(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "white", fontSize: "14px", marginTop: "4px"
  };

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)" }}>
      <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#e8eaf0" }}>Zuup Network Profile</h2>
      <p style={{ margin: "0 0 24px", fontSize: "14px", color: "#a1a1aa" }}>Manage your public profile at people.zuup.dev. Your position and department are managed by your team lead.</p>
      
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>Unique Slug *</label>
            <input name="slug" value={formData.slug} onChange={handleChange} required style={inputStyle} placeholder="e.g. jagrit" />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>Pronouns</label>
            <input name="pronouns" value={formData.pronouns} onChange={handleChange} style={inputStyle} placeholder="e.g. he/him" />
          </div>
        </div>

        <div>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>Tagline</label>
          <input name="tagline" value={formData.tagline} onChange={handleChange} style={inputStyle} placeholder="A short catchy phrase about you" />
        </div>

        <div>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>Bio</label>
          <textarea name="bio" value={formData.bio} onChange={handleChange} style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="Tell us about yourself..." />
        </div>

        <div>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>Skills (comma separated)</label>
          <input name="skills" value={formData.skills} onChange={handleChange} style={inputStyle} placeholder="React, Node.js, Design" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>Phone Number</label>
            <input name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} placeholder="+91 9876543210" />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>Website</label>
            <input name="website" value={formData.website} onChange={handleChange} style={inputStyle} placeholder="https://..." />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>GitHub URL</label>
            <input name="github" value={formData.github} onChange={handleChange} style={inputStyle} placeholder="https://github.com/..." />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>LinkedIn URL</label>
            <input name="linkedin" value={formData.linkedin} onChange={handleChange} style={inputStyle} placeholder="https://linkedin.com/in/..." />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>Twitter URL</label>
            <input name="twitter" value={formData.twitter} onChange={handleChange} style={inputStyle} placeholder="https://twitter.com/..." />
          </div>
          <div>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "#e8eaf0" }}>Instagram URL</label>
            <input name="instagram" value={formData.instagram} onChange={handleChange} style={inputStyle} placeholder="https://instagram.com/..." />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            background: "#e8425a", 
            color: "white", 
            padding: "12px", 
            borderRadius: "8px", 
            border: "none", 
            fontWeight: 700, 
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "8px"
          }}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Saving..." : "Save Public Profile"}
        </button>
      </form>
    </div>
  );
}
