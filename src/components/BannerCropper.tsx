"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, ZoomIn, ZoomOut, Check, RotateCw } from "lucide-react";

interface BannerCropperProps {
  imageSrc: string;
  onCrop: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export default function BannerCropper({ imageSrc, onCrop, onCancel }: BannerCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // LinkedIn style aspect ratio approx 4:1, let's use 1200x300 or 900x300.
  const CROP_WIDTH = 900;
  const CROP_HEIGHT = 300;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CROP_WIDTH;
    canvas.height = CROP_HEIGHT;

    ctx.clearRect(0, 0, CROP_WIDTH, CROP_HEIGHT);

    // Save state, apply transformations
    ctx.save();
    ctx.translate(CROP_WIDTH / 2 + offset.x, CROP_HEIGHT / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);

    // Compute natural aspect to fill the crop rectangle
    const { naturalWidth: nw, naturalHeight: nh } = img;
    const fitX = CROP_WIDTH / nw;
    const fitY = CROP_HEIGHT / nh;
    const fit = Math.max(fitX, fitY);
    const drawW = nw * fit;
    const drawH = nh * fit;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Dim overlay outside the crop area - not needed for rectangle if we clip,
    // but we can just draw the image taking the full canvas, so the canvas ITSELF is the crop window.
    // To make it look good in the UI, we scale down the canvas via CSS to fit the screen.
  }, [offset.x, offset.y, rotation, scale]);

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
  }, [imageSrc, draw]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) onCrop(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 animate-fade-in">
      <div className="bg-[var(--background)] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-[var(--color-bg-secondary)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-bg-secondary)] flex justify-between items-center bg-[var(--background)]">
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Reposition Cover Photo</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-[var(--color-bg-secondary)] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-black/90 p-4 sm:p-8 flex items-center justify-center overflow-hidden min-h-[40vh]">
          <div
            ref={containerRef}
            className="relative cursor-move select-none touch-none w-full max-w-3xl overflow-hidden rounded-lg shadow-xl"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* The canvas scales down responsively using CSS w-full but keeps aspect ratio */}
            <canvas
              ref={canvasRef}
              className="w-full h-auto block"
              style={{
                aspectRatio: `${CROP_WIDTH}/${CROP_HEIGHT}`,
              }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-[var(--background)] border-t border-[var(--color-bg-secondary)]">
          <div className="flex flex-col sm:flex-row items-center gap-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 w-full">
              <ZoomOut className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-full h-2 bg-[var(--color-bg-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary)]"
              />
              <ZoomIn className="w-5 h-5 text-[var(--color-text-secondary)] shrink-0" />
            </div>

            <div className="flex w-full sm:w-auto gap-3 justify-end">
              <button
                onClick={() => setRotation((r) => r + 90)}
                className="flex-1 sm:flex-none p-3 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-soft)] text-[var(--color-text-primary)] transition-colors font-medium"
                title="Rotate 90°"
              >
                <RotateCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                className="flex-[2] sm:flex-none px-8 py-3 flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition-all font-semibold shadow-lg shadow-[var(--color-primary)]/20"
              >
                <Check className="w-5 h-5" />
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
