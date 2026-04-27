"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import TipTapEditor from "@/components/TipTapEditor";
import { Image as ImageIcon, Loader2, Save, Send } from "lucide-react";
import { useToast } from "@/components/Toast";
import { safeJson } from "@/lib/api-utils";

export default function WriteClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get("edit");
  const { success, error, info } = useToast();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tags, setTags] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [loading, setLoading] = useState(!!editSlug);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Fetch post if editing
  useEffect(() => {
    if (!editSlug) return;

    const fetchPost = async () => {
      try {
        const res = await fetch(`/api/posts/${editSlug}`);
        const data = await safeJson(res);
        
        if (res.ok && data) {
          const post = data.post;
          // Security check: only author can edit
          if (post.author._id !== session?.user?.id) {
            router.push("/");
            return;
          }
          setTitle(post.title);
          setContent(post.content);
          setCoverImage(post.coverImage || "");
          setTags(post.tags?.join(", ") || "");
        } else {
          router.push("/write");
        }
      } catch (error) {
        console.error("Failed to fetch post", error);
        router.push("/write");
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) fetchPost();
  }, [editSlug, session, router]);

  const uploadFile = async (file: File) => {
    setUploadingCover(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await safeJson(res);
      if (data && data.url) setCoverImage(data.url);
    } catch (error) {
      console.error("Cover upload failed", error);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handlePublish = async (publishStatus: boolean) => {
    if (!title.trim() || !content.trim()) {
      error("Title and content are required.");
      return;
    }

    setIsPublishing(true);
    const tagsArray = tags.split(",").map(t => t.trim()).filter(Boolean);

    try {
      const url = editSlug ? `/api/posts/${editSlug}` : "/api/posts";
      const method = editSlug ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          coverImage,
          tags: tagsArray,
          isPublished: publishStatus
        })
      });

      const data = await safeJson(res);
      if (res.ok && data) {
        setLastSaved(new Date());
        if (!publishStatus) {
          success("Draft saved successfully!");
        }

        if (publishStatus) {
          router.push(`/post/${data.post.slug}`);
        } else if (!editSlug) {
          // If first save of a draft, move to edit mode
          router.replace(`/write?edit=${data.post.slug}`);
        }
      } else {
        error(data?.error || "Failed to save post");
      }
    } catch (error) {
      console.error("Failed to save", error);
    } finally {
      setIsPublishing(false);
    }
  };

  // Auto-save logic (every 30 seconds if changed)
  const lastContentRef = useRef(content);
  const lastTitleRef = useRef(title);

  useEffect(() => {
    if (!editSlug) return; // Only auto-save existing drafts/posts

    const timer = setInterval(() => {
      if (title !== lastTitleRef.current || content !== lastContentRef.current) {
        handlePublish(false);
        lastContentRef.current = content;
        lastTitleRef.current = title;
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [title, content, editSlug]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)] w-10 h-10" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-[var(--color-primary)]">
            {editSlug ? "Edit Story" : "Write a Story"}
          </h1>
          {lastSaved && (
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Last saved at {lastSaved.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => handlePublish(false)}
            disabled={isPublishing}
            className="flex-1 sm:flex-none px-5 py-2.5 text-[var(--color-text-secondary)] border border-[var(--color-bg-secondary)] rounded-xl hover:bg-[var(--color-bg-soft)] transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Save Draft
          </button>
          <button 
            onClick={() => handlePublish(true)}
            disabled={isPublishing}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[#7a350b] transition-colors font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20"
          >
            {isPublishing ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {editSlug ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Cover Image Upload */}
        <div 
          className={`relative w-full bg-[var(--color-bg-soft)] border-2 border-dashed border-[var(--color-bg-secondary)] rounded-2xl overflow-hidden flex flex-col items-center justify-center text-[var(--color-text-secondary)] transition-all ${coverImage ? 'border-none h-auto' : 'h-[280px] hover:bg-[var(--color-bg-secondary)]/50'}`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const file = e.dataTransfer.files?.[0];
            if (file) uploadFile(file);
          }}
        >
          {coverImage ? (
            <div className="relative w-full group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage} alt="Cover" className="w-full h-auto object-contain block" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white cursor-pointer backdrop-blur-sm">
                <ImageIcon className="w-12 h-12 mb-2" />
                <span className="font-bold text-lg">Change Cover Image</span>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-[var(--color-bg-secondary)] rounded-full flex items-center justify-center">
                  {uploadingCover ? <Loader2 className="animate-spin w-8 h-8 text-[var(--color-primary)]" /> : <ImageIcon className="w-8 h-8" />}
                </div>
                <div className="text-center">
                  <p className="font-bold text-[var(--color-text-primary)]">Add a cover image</p>
                  <p className="text-sm">Drag & drop or click to browse</p>
                </div>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleCoverUpload}
                disabled={uploadingCover}
              />
            </>
          )}
        </div>

        {/* Title */}
        <textarea 
          placeholder="New story title..." 
          className="w-full text-4xl lg:text-6xl font-heading font-black bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/30 resize-none overflow-hidden h-auto min-h-[60px]"
          rows={1}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onFocus={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />

        {/* TipTap Editor */}
        <div>
          <TipTapEditor content={content} onChange={setContent} />
        </div>

        {/* Tags */}
        <div className="pt-4 border-t border-[var(--color-bg-secondary)]">
          <label className="block text-xs font-black mb-2 text-[var(--color-text-secondary)] uppercase tracking-[0.2em]">Topics</label>
          <input 
            type="text" 
            placeholder="Add up to 5 topics (comma separated)..." 
            className="w-full p-4 border border-[var(--color-bg-secondary)] bg-[var(--color-bg-soft)] rounded-xl text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition-all"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
