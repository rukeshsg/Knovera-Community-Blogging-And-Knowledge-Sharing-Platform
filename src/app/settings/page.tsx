"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Camera, Globe, AtSign, Save, ArrowLeft, Code } from "lucide-react";
import Link from "next/link";
import ImageCropper from "@/components/ImageCropper";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    image: "",
    bio: "",
    website: "",
    twitter: "",
    github: ""
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (session?.user?.id) {
      const fetchProfile = async () => {
        try {
          const res = await fetch(`/api/users/${session.user.id}`);
          const data = await res.json();
          if (res.ok) {
            setFormData({
              name: data.user.name || "",
              image: data.user.image || "",
              bio: data.user.profile?.bio || "",
              website: data.user.profile?.socialLinks?.website || "",
              twitter: data.user.profile?.socialLinks?.twitter || "",
              github: data.user.profile?.socialLinks?.github || ""
            });
          }
        } catch (error) {
          console.error("Failed to fetch profile", error);
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [session, status, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset file input so same file can be re-selected
    e.target.value = "";
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  };

  const handleCropDone = async (blob: Blob) => {
    setCropSrc(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", blob, "avatar.jpg");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setFormData(prev => ({ ...prev, image: data.url }));
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        // Update session client-side
        await update({ name: formData.name, image: formData.image });
        router.refresh();
        alert("Profile updated successfully!");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Save failed", error);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      {/* Image Cropper Modal */}
      {cropSrc && (
        <ImageCropper
          imageSrc={cropSrc}
          onCrop={handleCropDone}
          onCancel={() => { setCropSrc(null); URL.revokeObjectURL(cropSrc); }}
        />
      )}    
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/profile/${session?.user?.id}`} className="p-2 hover:bg-[var(--color-bg-soft)] rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-heading font-black text-[var(--color-text-primary)]">Settings</h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-[var(--color-primary)] text-white font-bold rounded-xl hover:bg-[#7a350b] transition-all shadow-lg shadow-[var(--color-primary)]/20 flex items-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="bg-[var(--background)] border border-[var(--color-bg-secondary)] rounded-3xl overflow-hidden shadow-sm">
        <form onSubmit={handleSave} className="p-8 space-y-10">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-8 pb-10 border-b border-[var(--color-bg-secondary)]">
            <div className="relative group">
              <div className="w-32 h-32 rounded-[32px] overflow-hidden ring-4 ring-[var(--color-primary)]/10 shadow-xl bg-[var(--color-bg-soft)] flex items-center justify-center">
                {formData.image ? (
                  <Image src={formData.image} alt="Avatar" width={128} height={128} className="object-cover w-full h-full" />
                ) : (
                  <span className="text-5xl font-black text-[var(--color-primary)]">{formData.name.charAt(0)}</span>
                )}
              </div>
              <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 rounded-[32px] cursor-pointer transition-opacity backdrop-blur-sm">
                <Camera className="w-8 h-8 mb-1" />
                <span className="text-xs font-bold uppercase tracking-widest">Change</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
              </label>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[32px] backdrop-blur-sm">
                  <Loader2 className="animate-spin w-8 h-8 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-xl font-heading font-black text-[var(--color-text-primary)] mb-1">Profile Picture</h3>
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                PNG, JPG or WEBP. Max 2MB.<br/>A square image works best.
              </p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-secondary)] ml-1">Display Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="w-full px-5 py-4 rounded-2xl border border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all font-medium"
                placeholder="How should we call you?"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-secondary)] ml-1">Bio</label>
              <textarea 
                value={formData.bio}
                onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
                rows={4}
                className="w-full px-5 py-4 rounded-2xl border border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all font-medium resize-none"
                placeholder="Tell the world about yourself..."
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-6 pt-10 border-t border-[var(--color-bg-secondary)]">
            <h3 className="text-xl font-heading font-black text-[var(--color-text-primary)] mb-6">Social Presence</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
                <input 
                  type="url" 
                  value={formData.website}
                  onChange={e => setFormData(p => ({ ...p, website: e.target.value }))}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all font-medium"
                  placeholder="Personal website"
                />
              </div>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
                <input 
                  type="text" 
                  value={formData.twitter}
                  onChange={e => setFormData(p => ({ ...p, twitter: e.target.value }))}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all font-medium"
                  placeholder="X (Twitter) handle"
                />
              </div>
              <div className="relative sm:col-span-2">
                <Code className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-text-secondary)]" />
                <input 
                  type="text" 
                  value={formData.github}
                  onChange={e => setFormData(p => ({ ...p, github: e.target.value }))}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl border border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all font-medium"
                  placeholder="GitHub username"
                />
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
