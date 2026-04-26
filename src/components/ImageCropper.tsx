"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, ZoomIn, ZoomOut, Check, RotateCw } from "lucide-react";

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCrop, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const CROP_SIZE = 280;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);

    // Save state, apply transformations
    ctx.save();
    ctx.translate(CROP_SIZE / 2 + offset.x, CROP_SIZE / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Compute natural aspect to fill the crop circle
    const { naturalWidth: nw, naturalHeight: nh } = img;
    const fit = Math.max(CROP_SIZE / nw, CROP_SIZE / nh);
    const drawW = nw * fit;
    const drawH = nh * fit;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Circular mask overlay
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [scale, rotation, offset]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = imageSrc;
  }, [imageSrc, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };
  const onPointerUp = () => setIsDragging(false);

  // Touch zoom (pinch)
  const lastDist = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.hypot(dx, dy);
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = dist / lastDist.current;
      lastDist.current = dist;
      setScale((s) => Math.min(4, Math.max(0.5, s * delta)));
    }
  };

  const handleCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, "image/jpeg", 0.92);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[var(--background)] border border-[var(--color-bg-secondary)] rounded-3xl p-6 w-full max-w-sm mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-heading font-black text-lg text-[var(--color-text-primary)]">Adjust Photo</h3>
          <button onClick={onCancel} className="p-2 hover:bg-[var(--color-bg-soft)] rounded-full transition-colors">
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Canvas preview with circular crop guide */}
        <div
          ref={containerRef}
          className="relative mx-auto overflow-hidden rounded-full border-4 border-[var(--color-primary)] shadow-xl"
          style={{ width: CROP_SIZE, height: CROP_SIZE, cursor: isDragging ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          <canvas ref={canvasRef} width={CROP_SIZE} height={CROP_SIZE} className="w-full h-full" />
        </div>
        <p className="text-center text-xs text-[var(--color-text-secondary)] mt-3 mb-5">
          Drag to reposition · Pinch or use slider to zoom
        </p>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-5">
          <ZoomOut className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0" />
          <input
            type="range"
            min={50}
            max={400}
            value={Math.round(scale * 100)}
            onChange={(e) => setScale(Number(e.target.value) / 100)}
            className="flex-1 accent-[var(--color-primary)]"
          />
          <ZoomIn className="w-4 h-4 text-[var(--color-text-secondary)] flex-shrink-0" />
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 hover:bg-[var(--color-bg-soft)] rounded-xl transition-colors ml-2"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 border border-[var(--color-bg-secondary)] rounded-2xl text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-soft)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            className="flex-1 py-3 bg-[var(--color-primary)] text-white rounded-2xl text-sm font-bold hover:bg-[#7a350b] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/30"
          >
            <Check className="w-4 h-4" /> Use Photo
          </button>
        </div>
      </div>
    </div>
  );
}
