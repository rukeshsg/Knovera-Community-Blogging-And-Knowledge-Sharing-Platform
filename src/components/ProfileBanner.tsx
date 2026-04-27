"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Loader2, ImagePlus } from "lucide-react";
import { safeJson } from "@/lib/api-utils";
import BannerCropper from "./BannerCropper";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";

interface ProfileBannerProps {
  initialCoverImage?: string;
  isOwnProfile: boolean;
  userId: string;
}

export default function ProfileBanner({ initialCoverImage, isOwnProfile, userId }: ProfileBannerProps) {
  const [coverImage, setCoverImage] = useState<string | undefined>(initialCoverImage);
  const [isUploading, setIsUploading] = useState(false);
  const [rawImage, setRawImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { success, error } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      error("Please select a valid image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      error("Image must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Reset input
  };

  const uploadToCloudinary = async (blob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("file", blob, "cover.jpg");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await safeJson(res);
    if (!res.ok) throw new Error(data?.error || "Failed to upload image");
    return data.url;
  };

  const handleCrop = async (croppedBlob: Blob) => {
    setRawImage(null);
    setIsUploading(true);

    try {
      // 1. Create a local preview URL immediately for optimistic UI
      const localUrl = URL.createObjectURL(croppedBlob);
      setCoverImage(localUrl);

      // 2. Upload to Cloudinary
      const cloudUrl = await uploadToCloudinary(croppedBlob);

      // 3. Update User Profile in DB
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: cloudUrl }),
      });

      if (!res.ok) throw new Error("Failed to save profile");
      
      // Update with final URL (in case localUrl expires)
      setCoverImage(cloudUrl);
      success("Cover photo updated successfully!");
      router.refresh();
    } catch (err) {
      console.error(err);
      error("Failed to update cover photo");
      setCoverImage(initialCoverImage); // Revert on failure
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] overflow-hidden group">
        {/* Cover Image or Gradient */}
        {coverImage ? (
          <Image
            src={coverImage}
            alt="Cover Photo"
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
            unoptimized={coverImage.startsWith('blob:')}
          />
        ) : (
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        )}

        {/* Overlay / Action Button */}
        {isOwnProfile && (
          <>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md p-2.5 sm:px-4 sm:py-2.5 rounded-full sm:rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2 border border-white/10 group/btn"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : coverImage ? (
                <Camera className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
              ) : (
                <ImagePlus className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
              )}
              <span className="hidden sm:inline font-medium text-sm">
                {isUploading ? "Uploading..." : coverImage ? "Edit Cover" : "Add Cover"}
              </span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {rawImage && (
        <BannerCropper
          imageSrc={rawImage}
          onCrop={handleCrop}
          onCancel={() => setRawImage(null)}
        />
      )}
    </>
  );
}
