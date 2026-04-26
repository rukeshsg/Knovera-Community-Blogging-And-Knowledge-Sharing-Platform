"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TipTapEditor from "@/components/TipTapEditor";
import { Image as ImageIcon, Loader2 } from "lucide-react";

export default function WritePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tags, setTags] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setCoverImage(data.url);
    } catch (error) {
      console.error("Cover upload failed", error);
    } finally {
      setUploadingCover(false);
    }
  };

  const handlePublish = async (isPublished: boolean) => {
    if (!title || !content) {
      alert("Title and content are required.");
      return;
    }

    setIsPublishing(true);
    const tagsArray = tags.split(",").map(t => t.trim()).filter(Boolean);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          coverImage,
          tags: tagsArray,
          isPublished
        })
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/post/${data.post.slug}`);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Failed to publish", error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-heading font-bold text-[var(--color-primary)]">Write a Story</h1>
        <div className="flex gap-4">
          <button 
            onClick={() => handlePublish(false)}
            disabled={isPublishing}
            className="px-4 py-2 text-[var(--color-text-secondary)] border border-[var(--color-bg-secondary)] rounded-lg hover:bg-[var(--color-bg-soft)] transition-colors font-medium"
          >
            Save Draft
          </button>
          <button 
            onClick={() => handlePublish(true)}
            disabled={isPublishing}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-soft)] transition-colors font-medium flex items-center gap-2"
          >
            {isPublishing ? <Loader2 className="animate-spin" size={18} /> : null}
            Publish
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Cover Image Upload */}
        <div className="relative w-full h-[250px] bg-[var(--color-bg-soft)] border-2 border-dashed border-[var(--color-bg-secondary)] rounded-xl overflow-hidden flex flex-col items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              {uploadingCover ? <Loader2 className="animate-spin w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
              <span>{uploadingCover ? "Uploading..." : "Add a cover image"}</span>
            </div>
          )}
          <input 
            type="file" 
            accept="image/*" 
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleCoverUpload}
            disabled={uploadingCover}
          />
        </div>

        {/* Title */}
        <input 
          type="text" 
          placeholder="Title" 
          className="w-full text-4xl lg:text-5xl font-heading font-bold bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* TipTap Editor */}
        <TipTapEditor content={content} onChange={setContent} />

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--color-text-secondary)]">Tags (comma separated)</label>
          <input 
            type="text" 
            placeholder="e.g. Technology, Programming, AI" 
            className="w-full p-3 border border-[var(--color-bg-secondary)] bg-[var(--background)] rounded-lg text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
