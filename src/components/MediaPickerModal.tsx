"use client";
import React, { useState, useRef, useEffect, useCallback, DragEvent } from "react";
import NextImage from "next/image";
import { X, Upload, Link as LinkIcon, Image as ImageIcon, Film, PlaySquare as YoutubeIcon, Loader2, CheckCircle, Trash2 } from "lucide-react";

type MediaMode = "image" | "gif" | "youtube";
type Tab = "upload" | "url";

interface Props {
  mode: MediaMode;
  onInsertImages: (urls: string[]) => void;
  onInsertUrl: (url: string, type: "image" | "gif" | "youtube") => void;
  onClose: () => void;
}

const MODE_CONFIG = {
  image:   { title: "Insert Image",  accept: "image/jpeg,image/png,image/webp,image/gif", icon: <ImageIcon size={18} /> },
  gif:     { title: "Insert GIF",    accept: "image/gif",                                  icon: <Film size={18} />      },
  youtube: { title: "Embed YouTube", accept: "",                                            icon: <YoutubeIcon size={18} /> },
};

interface Preview { file: File; previewUrl: string; uploaded?: string; uploading?: boolean; error?: string; }

export default function MediaPickerModal({ mode, onInsertImages, onInsertUrl, onClose }: Props) {
  const cfg = MODE_CONFIG[mode];
  const [tab, setTab] = useState<Tab>(mode === "youtube" ? "url" : "upload");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      return d.url || null;
    } catch { return null; }
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const newPreviews: Preview[] = arr.map(f => ({ file: f, previewUrl: URL.createObjectURL(f), uploading: true }));
    setPreviews(prev => [...prev, ...newPreviews]);
    for (let i = 0; i < arr.length; i++) {
      const uploaded = await uploadFile(arr[i]);
      setPreviews(prev => prev.map(p =>
        p.file === arr[i]
          ? { ...p, uploading: false, uploaded: uploaded || undefined, error: uploaded ? undefined : "Upload failed" }
          : p
      ));
    }
  }, [uploadFile]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
  };

  const removePreview = (idx: number) => {
    URL.revokeObjectURL(previews[idx].previewUrl);
    setPreviews(p => p.filter((_, i) => i !== idx));
  };

  const handleInsertUploads = () => {
    const urls = previews.filter(p => p.uploaded).map(p => p.uploaded!);
    if (!urls.length) return;
    onInsertImages(urls);
    onClose();
  };

  const detectUrlType = (u: string): "image" | "gif" | "youtube" => {
    if (/youtu\.?be/i.test(u)) return "youtube";
    if (/\.gif(\?|$)/i.test(u)) return "gif";
    return "image";
  };

  const handleInsertUrl = async () => {
    setUrlError("");
    const trimmed = url.trim();
    if (!trimmed) { setUrlError("Please enter a URL."); return; }
    if (mode === "youtube" && !/youtu\.?be/i.test(trimmed)) { setUrlError("Please enter a valid YouTube URL."); return; }
    setIsInserting(true);
    await new Promise(r => setTimeout(r, 300));
    const type = mode === "youtube" ? "youtube" : detectUrlType(trimmed);
    onInsertUrl(trimmed, type);
    setIsInserting(false);
    onClose();
  };

  const readyCount = previews.filter(p => p.uploaded).length;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ animation: "mediaFadeIn 0.15s ease-out" }}
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <style>{`
        @keyframes mediaFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes mediaSlideUp { from { opacity:0; transform:scale(.95) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>

      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--background)",
          border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
          animation: "mediaSlideUp 0.18s ease-out",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)" }}
        >
          <div className="flex items-center gap-2 font-semibold" style={{ color: "var(--color-primary)" }}>
            {cfg.icon}
            {cfg.title}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--color-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-secondary)")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        {mode !== "youtube" && (
          <div style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)", display: "flex" }}>
            {(["upload", "url"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-sm font-semibold transition-colors capitalize"
                style={{
                  color: tab === t ? "var(--color-primary)" : "var(--color-text-secondary)",
                  borderBottom: tab === t ? "2px solid var(--color-primary)" : "2px solid transparent",
                  marginBottom: tab === t ? "-1px" : undefined,
                }}
              >
                {t === "upload" ? "📁 Upload" : "🔗 Paste URL"}
              </button>
            ))}
          </div>
        )}

        <div className="p-5">
          {/* Upload Tab */}
          {tab === "upload" && mode !== "youtube" && (
            <div className="space-y-4">
              {/* Drag & Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
                style={{
                  borderColor: isDragging ? "var(--color-primary)" : "color-mix(in srgb, var(--color-primary) 25%, transparent)",
                  background: isDragging ? "color-mix(in srgb, var(--color-primary) 8%, transparent)" : "color-mix(in srgb, var(--color-primary) 3%, transparent)",
                }}
              >
                <Upload className="mx-auto mb-3" size={32} style={{ color: "var(--color-primary)", opacity: 0.7 }} />
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Drag &amp; drop files here</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>or click to browse</p>
                <p className="text-[11px] mt-2" style={{ color: "var(--color-text-muted, var(--color-text-secondary))", opacity: 0.6 }}>
                  {mode === "gif" ? "GIF files only" : "JPG, PNG, WEBP, GIF"}
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept={cfg.accept} multiple={mode === "image"} className="hidden" onChange={onFileChange} />

              {/* Previews */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((p, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden aspect-square" style={{ background: "color-mix(in srgb, var(--color-primary) 8%, var(--color-bg-secondary))" }}>
                      <NextImage src={p.previewUrl} alt="" fill className="object-cover" />
                      {p.uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 size={20} className="animate-spin text-white" />
                        </div>
                      )}
                      {p.uploaded && (
                        <div className="absolute top-1 right-1 rounded-full p-0.5" style={{ background: "var(--color-primary)" }}>
                          <CheckCircle size={12} className="text-white" />
                        </div>
                      )}
                      {p.error && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <p className="text-red-400 text-[10px] text-center px-1">Failed</p>
                        </div>
                      )}
                      <button
                        onClick={() => removePreview(i)}
                        className="absolute bottom-1 right-1 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: "rgba(0,0,0,0.7)", color: "var(--color-primary)" }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {previews.length > 0 && (
                <button
                  onClick={handleInsertUploads}
                  disabled={previews.some(p => p.uploading) || readyCount === 0}
                  className="w-full py-2.5 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--color-primary)" }}
                >
                  {previews.some(p => p.uploading)
                    ? <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                    : `Insert ${readyCount} Image${readyCount !== 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          )}

          {/* URL Tab / YouTube */}
          {(tab === "url" || mode === "youtube") && (
            <div className="space-y-4">
              {mode === "youtube" && (
                <div
                  className="flex items-center gap-2 p-3 rounded-xl"
                  style={{
                    background: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
                  }}
                >
                  <YoutubeIcon size={16} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: "var(--color-primary)", opacity: 0.85 }}>
                    Paste a YouTube video URL to embed it in your story
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
                  {mode === "youtube" ? "YouTube URL" : mode === "gif" ? "GIF URL" : "Image URL"}
                </label>
                <div className="relative">
                  <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-secondary)" }} />
                  <input
                    type="url"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setUrlError(""); }}
                    onKeyDown={e => { if (e.key === "Enter") handleInsertUrl(); }}
                    placeholder={mode === "youtube" ? "https://youtube.com/watch?v=..." : mode === "gif" ? "https://media.giphy.com/..." : "https://example.com/image.jpg"}
                    className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
                    style={{
                      background: "var(--color-bg-secondary)",
                      border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)",
                      color: "var(--color-text-primary)",
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--color-primary)")}
                    onBlur={e => (e.currentTarget.style.borderColor = "color-mix(in srgb, var(--color-primary) 20%, transparent)")}
                    autoFocus
                  />
                </div>
                {urlError && <p className="text-xs text-red-400 mt-1">{urlError}</p>}
              </div>

              {url.trim() && mode !== "youtube" && (
                <div className="rounded-xl overflow-hidden h-32 relative" style={{ border: "1px solid color-mix(in srgb, var(--color-primary) 15%, transparent)", background: "var(--color-bg-secondary)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Preview" className="w-full h-full object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                </div>
              )}

              <button
                onClick={handleInsertUrl}
                disabled={isInserting || !url.trim()}
                className="w-full py-2.5 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--color-primary)" }}
              >
                {isInserting ? <><Loader2 size={16} className="animate-spin" /> Inserting...</> : mode === "youtube" ? "Embed Video" : "Insert Media"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
