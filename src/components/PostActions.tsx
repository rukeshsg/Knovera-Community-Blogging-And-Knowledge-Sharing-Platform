"use client";
import { useState } from "react";
import { Bookmark, BookmarkCheck, Share2, Copy, Check, ExternalLink } from "lucide-react";
import { safeJson } from "@/lib/api-utils";

// ─── Bookmark Button ─────────────────────────────────────────────────────────
interface BookmarkProps {
  postId: string;
  initialBookmarked: boolean;
  isLoggedIn: boolean;
}

export function BookmarkButton({ postId, initialBookmarked, isLoggedIn }: BookmarkProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!isLoggedIn) { window.location.href = "/login"; return; }
    setLoading(true);
    setBookmarked((b) => !b); // Optimistic

    try {
      const res = await fetch(`/api/posts/${postId}/bookmark`, { method: "POST" });
      const data = await safeJson(res);
      if (res.ok && data) {
        setBookmarked(data.bookmarked);
      } else {
        setBookmarked((b) => !b); // Revert
      }
    } catch {
      setBookmarked((b) => !b); // Revert
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={bookmarked ? "Remove bookmark" : "Bookmark this post"}
      className={`p-2.5 rounded-xl border transition-all ${
        bookmarked
          ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]"
          : "border-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
      } disabled:opacity-50`}
    >
      {bookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
    </button>
  );
}

// ─── Share Button with Dropdown ──────────────────────────────────────────────
interface ShareProps {
  title: string;
  slug: string;
  postId: string;
}

export function ShareButton({ title, slug, postId }: ShareProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined"
    ? `${window.location.origin}/post/${slug}`
    : `/post/${slug}`;

  const trackShare = () => {
    fetch(`/api/posts/${postId}/share`, { method: "POST" }).catch(() => {});
  };

  const handleCopy = async () => {
    trackShare();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Share"
        className="p-2.5 rounded-xl border border-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div 
            className="absolute right-0 top-full mt-2 z-50 w-56 bg-[var(--background)] border border-[var(--color-bg-secondary)] rounded-2xl shadow-2xl p-2 flex flex-col gap-1 origin-top-right transition-all"
            style={{ animation: 'aiMenuIn 0.15s ease-out' }}
          >
            <div className="px-3 py-2 mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-secondary)] opacity-60">Share this story</p>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)] hover:text-[var(--color-primary)] rounded-xl transition-all"
            >
              <div className={`p-1.5 rounded-lg ${copied ? "bg-green-500/10 text-green-500" : "bg-[var(--color-bg-secondary)]"}`}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </div>
              {copied ? "Copied Link!" : "Copy URL"}
            </button>
            <div className="h-px bg-[var(--color-bg-secondary)] my-1 mx-2" />
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setOpen(false); trackShare(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)] hover:text-[#1DA1F2] rounded-xl transition-all"
            >
              <div className="p-1.5 rounded-lg bg-[#1DA1F2]/10 text-[#1DA1F2]">
                <ExternalLink className="w-4 h-4" />
              </div>
              Share on X
            </a>
            <a
              href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setOpen(false); trackShare(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)] hover:text-[#0A66C2] rounded-xl transition-all"
            >
              <div className="p-1.5 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2]">
                <ExternalLink className="w-4 h-4" />
              </div>
              Share on LinkedIn
            </a>
          </div>
        </>
      )}
    </div>
  );
}
