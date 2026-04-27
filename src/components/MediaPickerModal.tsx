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
  image:   { title: "Insert Image",   accept: "image/jpeg,image/png,image/webp,image/gif", icon: <ImageIcon size={18} />, color: "blue"   },
  gif:     { title: "Insert GIF",     accept: "image/gif",                                  icon: <Film size={18} />,      color: "pink"   },
  youtube: { title: "Embed YouTube",  accept: "",                                            icon: <YoutubeIcon size={18} />,   color: "red"    },
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

  // ESC to close
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

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ animation: "fadeIn 0.15s ease-out" }}
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:scale(.95) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
      `}</style>

      <div
        className="relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "slideUp 0.18s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2 text-white font-semibold">
            <span className="text-gray-400">{cfg.icon}</span>
            {cfg.title}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs (not for youtube) */}
        {mode !== "youtube" && (
          <div className="flex border-b border-gray-700">
            {(["upload", "url"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors capitalize ${tab === t ? "text-white border-b-2 border-blue-500 -mb-px" : "text-gray-400 hover:text-gray-200"}`}
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
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging ? "border-blue-400 bg-blue-500/10" : "border-gray-600 hover:border-gray-400 hover:bg-gray-800/50"
                }`}
              >
                <Upload className="mx-auto mb-3 text-gray-400" size={32} />
                <p className="text-sm font-semibold text-gray-200">Drag & drop files here</p>
                <p className="text-xs text-gray-500 mt-1">or click to browse</p>
                <p className="text-[11px] text-gray-600 mt-2">
                  {mode === "gif" ? "GIF files only" : "JPG, PNG, WEBP, GIF"}
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept={cfg.accept} multiple={mode === "image"} className="hidden" onChange={onFileChange} />

              {/* Previews */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((p, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden bg-gray-800 aspect-square">
                      <NextImage src={p.previewUrl} alt="" fill className="object-cover" />
                      {p.uploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 size={20} className="animate-spin text-white" />
                        </div>
                      )}
                      {p.uploaded && (
                        <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
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
                        className="absolute bottom-1 right-1 p-1 bg-black/70 rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300"
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
                  disabled={previews.some(p => p.uploading) || !previews.some(p => p.uploaded)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {previews.some(p => p.uploading) ? <><Loader2 size={16} className="animate-spin" /> Uploading...</> : `Insert ${previews.filter(p => p.uploaded).length} Image${previews.filter(p => p.uploaded).length !== 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          )}

          {/* URL Tab / YouTube */}
          {(tab === "url" || mode === "youtube") && (
            <div className="space-y-4">
              {mode === "youtube" && (
                <div className="flex items-center gap-2 p-3 bg-red-950/30 border border-red-800/40 rounded-xl">
                  <YoutubeIcon size={16} className="text-red-400 shrink-0" />
                  <p className="text-xs text-red-300">Paste a YouTube video URL to embed it in your story</p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {mode === "youtube" ? "YouTube URL" : mode === "gif" ? "GIF URL" : "Image URL"}
                </label>
                <div className="relative">
                  <LinkIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="url"
                    value={url}
                    onChange={e => { setUrl(e.target.value); setUrlError(""); }}
                    onKeyDown={e => { if (e.key === "Enter") handleInsertUrl(); }}
                    placeholder={mode === "youtube" ? "https://youtube.com/watch?v=..." : mode === "gif" ? "https://media.giphy.com/..." : "https://example.com/image.jpg"}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-600 rounded-xl text-sm text-white placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                    autoFocus
                  />
                </div>
                {urlError && <p className="text-xs text-red-400 mt-1">{urlError}</p>}
              </div>

              {/* URL Preview */}
              {url.trim() && mode !== "youtube" && (
                <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-800 h-32 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Preview" className="w-full h-full object-contain" onError={e => (e.currentTarget.style.display = "none")} />
                </div>
              )}

              <button
                onClick={handleInsertUrl}
                disabled={isInserting || !url.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
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
